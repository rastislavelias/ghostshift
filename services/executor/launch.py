"""Trusted privilege drop, started without secrets; exec only supervisor-selected commands."""
import os, resource, sys
os.setgroups([])
os.setgid(1001)
os.setuid(1001)
# Process count is enforced by the per-container pids cgroup. RLIMIT_NPROC
# counts the same host UID across containers and would interfere with other stacks.
resource.setrlimit(resource.RLIMIT_NOFILE, (256, 256))
resource.setrlimit(resource.RLIMIT_FSIZE, (32 * 1024 * 1024, 32 * 1024 * 1024))
resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
os.execvpe(sys.argv[1], sys.argv[1:], os.environ)
