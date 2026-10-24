import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
assert.equal(process.env.GHOSTSHIFT_TEST_FIXTURE, '1');
const project = process.env.TEST_COMPOSE_PROJECT;
assert.ok(['ghostshift-ci', 'ghostshift-development-test'].includes(project));
const script = `
const fs = require('node:fs');
const path = require('node:path');
function manifest(dir, prefix='') { return Object.fromEntries(fs.readdirSync(path.join(dir,prefix), {withFileTypes:true}).flatMap(e => { const name=prefix ? prefix+'/'+e.name : e.name; return e.isDirectory() ? Object.entries(manifest(dir,name)) : [[name,fs.readFileSync(path.join(dir,name),'utf8')]]; })); }
const files=manifest('/app/examples/playground');
const headers={'Content-Type':'application/json',Authorization:'Bearer '+process.env.EXECUTOR_TOKEN};
const endpoint='http://executor:8080/execute';
(async()=>{
 const bad=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({id:'abcdef-1',files:{...files,'package.json':'{}'}})});
 if(bad.status!==400) throw Error('Protected dependency file accepted');
 const denied=await fetch(endpoint,{method:'POST',headers:{...headers,Authorization:'Bearer wrong'},body:'{}'});
 if(denied.status!==403) throw Error('Unauthenticated execution accepted');
 files['app/page.tsx']=\`import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
if (existsSync('/tmp/ghostshift-previous-run')) throw new Error('Previous temporary data retained');
writeFileSync('/tmp/ghostshift-current-run','Disposable sandbox test');
if (process.env.EXECUTOR_TOKEN || process.env.PGPASSWORD || process.env.OPENAI_API_KEY) throw new Error('Secret inherited');
let rootReadable = false; try { readFileSync('/proc/1/environ'); rootReadable=true; } catch {}
if (rootReadable) throw new Error('Supervisor environment readable');
if (!readFileSync('/proc/self/status','utf8').includes('CapEff:\\t0000000000000000')) throw new Error('Child has capabilities');
let writable=false; try { writeFileSync('/dependencies/escape','x'); writable=true; } catch {}
if(writable) throw new Error('Root filesystem writable');
for (const host of ['127.0.0.1','1.1.1.1']) {
 execFileSync(process.execPath, ['-e', "const s=require('node:net').connect({host:process.argv[1],port:8080});s.on('connect',()=>process.exit(1));s.on('error',()=>process.exit(0));setTimeout(()=>process.exit(2),1500);", host], {timeout:2000});
}
export default function Home(){return <main><h1>Sandbox boundary checks</h1><p>Network, secrets, privileges and filesystem restrictions verified.</p></main>;}\`;
 const result=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({id:'abcdef-2',files})});
 const data=await result.json();
 if(result.status!==200 || data.passed!==true) throw Error(JSON.stringify(data));
 console.log(JSON.stringify(data.checks.map(c=>({name:c.name,passed:c.passed}))));
})().catch(e=>{console.error(e.message);process.exit(1)});
`;
const marker = spawnSync('docker', ['compose','-f','compose.yaml','-f','compose.test.yaml','-p',project,'exec','-T','--user','1001','executor','node','-e',"require('node:fs').writeFileSync('/tmp/ghostshift-previous-run','Disposable previous request')"], { env: process.env, encoding: 'utf8' });
assert.equal(marker.status, 0, marker.stderr);
const result = spawnSync('docker', ['compose','-f','compose.yaml','-f','compose.test.yaml','-p',project,'exec','-T','developer','node','-e',script], { env: process.env, encoding: 'utf8', timeout: 240000 });
assert.equal(result.status, 0, result.stderr + result.stdout);
const cleaned = spawnSync('docker', ['compose','-f','compose.yaml','-f','compose.test.yaml','-p',project,'exec','-T','executor','node','-e',"process.exit(require('node:fs').existsSync('/tmp/ghostshift-current-run') ? 1 : 0)"], { env: process.env, encoding: 'utf8' });
assert.equal(cleaned.status, 0, 'Temporary data must be removed after execution.');
console.log('Sandbox checks passed: authentication, protected manifest, denied network, no inherited secrets, no child capabilities, read-only dependency filesystem and temporary-data cleanup.');
