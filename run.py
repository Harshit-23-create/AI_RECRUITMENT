import subprocess
import sys
import threading
import os
import signal

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding='utf-8')

def run_backend():
    print("Starting backend...")
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend'))
    
    # We need to install requirements if they are not installed, but let's assume they are.
    # Start uvicorn
    process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"],
        cwd=backend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="ignore"
    )
    for line in process.stdout:
        print(f"[BACKEND] {line}", end="")
    return process

def run_frontend():
    print("Starting frontend...")
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'frontend'))
    
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    
    process = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=frontend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="ignore"
    )
    for line in process.stdout:
        print(f"[FRONTEND] {line}", end="")
    return process

def main():
    backend_thread = threading.Thread(target=run_backend)
    frontend_thread = threading.Thread(target=run_frontend)

    backend_thread.daemon = True
    frontend_thread.daemon = True

    backend_thread.start()
    frontend_thread.start()

    try:
        # Keep main thread alive
        while True:
            pass
    except KeyboardInterrupt:
        print("Stopping both servers...")
        sys.exit(0)

if __name__ == "__main__":
    main()
