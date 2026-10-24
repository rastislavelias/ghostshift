"""Fixed-command sandbox supervisor. Generated code runs as a separate, network-denied UID."""
import hmac, json, os, pathlib, resource, shutil, signal, subprocess, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TOKEN = os.environ['EXECUTOR_TOKEN']
ROOT = pathlib.Path('/work')
TEMPLATE = pathlib.Path('/template')
EDITABLE = {'app/page.tsx', 'app/globals.css'}
FILES = [str(p.relative_to(TEMPLATE)) for p in TEMPLATE.rglob('*') if p.is_file()]
lock = threading.Lock()
state = {'id': None, 'cancel': threading.Event()}
# Root serves control requests; all new connections from generated code are rejected,
# including loopback and Docker DNS. Existing root-initiated response traffic is allowed.
subprocess.run(['iptables', '-A', 'OUTPUT', '-m', 'conntrack', '--ctstate', 'ESTABLISHED,RELATED', '-j', 'ACCEPT'], check=True)
subprocess.run(['iptables', '-A', 'OUTPUT', '-m', 'owner', '--uid-owner', '1001', '-j', 'REJECT'], check=True)
# IPv6 is disabled by Compose. Refuse startup if it is unexpectedly usable.
if pathlib.Path('/proc/sys/net/ipv6/conf/all/disable_ipv6').read_text().strip() != '1':
    raise RuntimeError('IPv6 must be disabled')

def kill_children():
    for entry in pathlib.Path('/proc').iterdir():
        if not entry.name.isdigit(): continue
        try:
            uid = next(line for line in (entry / 'status').read_text().splitlines() if line.startswith('Uid:')).split()[1]
            if uid == '1001': os.kill(int(entry.name), signal.SIGKILL)
        except (OSError, StopIteration): pass

def run_check(name, command, deadline):
    started = time.monotonic()
    # No provider, database or supervisor secrets are inherited by generated code.
    env = {'PATH': '/usr/local/bin:/usr/bin:/bin', 'HOME': '/tmp', 'TMPDIR': '/tmp',
           'NODE_ENV': 'production', 'NEXT_TELEMETRY_DISABLED': '1', 'CI': '1'}
    output = ROOT / 'check-output'
    with output.open('wb') as log:
        process = subprocess.Popen(['python3', '/supervisor/launch.py', *command], cwd=ROOT / 'project', env=env, stdout=log, stderr=subprocess.STDOUT,
                                   start_new_session=True)
        while process.poll() is None:
            if state['cancel'].is_set() or time.monotonic() > deadline:
                kill_children()
                break
            time.sleep(.15)
        process.wait()
    kill_children()
    return {'name': name, 'passed': process.returncode == 0 and not state['cancel'].is_set() and time.monotonic() <= deadline,
            'output': output.read_bytes()[:10000].decode('utf8', errors='replace'),
            'durationMs': int((time.monotonic() - started) * 1000)}

def execute(data):
    if not isinstance(data, dict) or set(data) != {'id', 'files'}: raise ValueError('Invalid request')
    run_id = data['id']
    if not isinstance(run_id, str) or len(run_id) > 80 or not all(c in '0123456789abcdef-' for c in run_id): raise ValueError('Invalid id')
    files = data['files']
    if not isinstance(files, dict) or set(files) != set(FILES): raise ValueError('Repository manifest mismatch')
    for name, content in files.items():
        if not isinstance(content, str) or len(content.encode()) > 100000 or '\0' in content: raise ValueError('Invalid file')
        if name not in EDITABLE and content != (TEMPLATE / name).read_text(): raise ValueError('Protected file changed')
    if not lock.acquire(blocking=False): return None
    try:
        state['id'] = run_id
        state['cancel'].clear()
        kill_children()
        for item in ROOT.iterdir():
            if item.is_dir() and not item.is_symlink(): shutil.rmtree(item)
            else: item.unlink()
        project = ROOT / 'project'
        project.mkdir()
        for name, content in files.items():
            path = project / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content)
        (project / 'node_modules').symlink_to('/dependencies/node_modules')
        for path in [project] + list(project.rglob('*')):
            if not path.is_symlink(): os.chown(path, 1001, 1001)
        deadline = time.monotonic() + 180
        checks = []
        for name, command in [('TypeScript', ['node', '/dependencies/node_modules/typescript/bin/tsc', '--noEmit']),
                              ('Page tests', ['node', '--test', 'tests/page.test.mjs']),
                              ('Production build', ['node', '/dependencies/node_modules/next/dist/bin/next', 'build', '--webpack'])]:
            result = run_check(name, command, deadline)
            checks.append(result)
            if not result['passed']: break
            # Source changes during execution are never accepted as new model output.
            for filename in FILES:
                path = project / filename
                if path.is_symlink() or not path.is_file() or path.read_text() != files[filename]:
                    # Next.js may regenerate this declaration; it is never returned as an artifact.
                    if filename != 'next-env.d.ts': raise ValueError('Source mutated during execution: ' + filename)
        return {'checks': checks, 'passed': len(checks) == 3 and all(c['passed'] for c in checks)}
    finally:
        kill_children()
        state['id'] = None
        lock.release()

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_): pass
    def reply(self, code, value):
        body = json.dumps(value).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        try: self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError): pass
    def do_GET(self):
        self.reply(200 if self.path == '/health' else 404, {'ok': self.path == '/health'})
    def do_POST(self):
        if not hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + TOKEN): return self.reply(403, {'error': 'Forbidden'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 250000: raise ValueError()
            self.connection.settimeout(10)
            data = json.loads(self.rfile.read(length))
            if self.path == '/cancel':
                if data.get('id') == state['id']:
                    state['cancel'].set()
                    kill_children()
                return self.reply(200, {'ok': True})
            if self.path != '/execute': return self.reply(404, {'error': 'Not found'})
            result = execute(data)
            self.reply(409 if result is None else 200, result or {'error': 'Busy'})
        except Exception as error:
            print('Executor request failed:', type(error).__name__, str(error)[:120], flush=True)
            self.reply(400, {'error': 'Execution rejected or interrupted'})
ThreadingHTTPServer(('0.0.0.0', 8080), Handler).serve_forever()
