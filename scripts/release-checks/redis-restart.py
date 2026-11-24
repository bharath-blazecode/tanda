"""From the repo root after npm run build. Only disposable loopback services."""
import json
import os
import secrets
import socket
import subprocess
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4


def docker(*args):
    result = subprocess.run(["docker", *args], text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError("Disposable Docker fixture command failed: " + args[0])
    return result.stdout.strip()


def eventually(check):
    for _ in range(60):
        try:
            if check():
                return
        except (OSError, RuntimeError):
            pass
        time.sleep(0.2)
    raise RuntimeError("Local fixture check timed out")


with socket.socket() as sock:
    sock.bind(("127.0.0.1", 0))
    app_port = sock.getsockname()[1]
origin = f"http://127.0.0.1:{app_port}"
password = secrets.token_hex(24)
container = docker(
    "run", "-d", "--publish", "127.0.0.1::6379", "redis:7.4-alpine",
    "redis-server", "--appendonly", "yes", "--appendfsync", "always", "--requirepass", password,
)
app = None
key = "kachka:room:v1"


def redis(*args):
    return docker("exec", "-e", "REDISCLI_AUTH=" + password, container, "redis-cli", "--raw", *args)


def api(path="", body=None):
    request = Request(origin + "/api/room" + path, data=json.dumps(body).encode() if body else None,
                      headers={"Content-Type": "application/json"})
    try:
        with urlopen(request, timeout=8) as response:
            return response.status, json.loads(response.read() or "null")
    except HTTPError as error:
        return error.code, None


def start_app():
    port = docker("port", container, "6379/tcp").split(":")[-1]
    env = dict(os.environ, HOST="127.0.0.1", PORT=str(app_port), VERDICT_ENABLED="false",
               ANTHROPIC_API_KEY="", ROOM_ADMIN_TOKEN="", REDIS_URL=f"redis://:{password}@127.0.0.1:{port}")
    return subprocess.Popen(["node", "dist-server/index.cjs"], env=env,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def stop_app(process):
    if process and process.poll() is None:
        process.terminate()
        process.wait(timeout=12)


try:
    eventually(lambda: redis("PING") == "PONG")
    assert "NOAUTH" in docker("exec", container, "redis-cli", "PING")
    app = start_app()
    eventually(lambda: app.poll() is None and api()[0] == 200)
    removed, control = str(uuid4()), str(uuid4())
    for device, name in [(removed, "Quiet Heron"), (control, "Calm Bilby")]:
        result = dict(intent="share-ticket", deviceId=device, nickname=name, score=73,
                      mode="demo", verdict="steady")
        assert api("/result", result)[0] == 204
    eventually(lambda: redis("HLEN", key) == "2")
    assert int(redis("TTL", key)) > 0
    old_binding = docker("port", container, "6379/tcp")
    docker("stop", container)
    assert api("/withdraw", {"deviceId": removed})[0] == 503
    docker("start", container)
    eventually(lambda: redis("PING") == "PONG")
    # Restarting a container can reassign its ephemeral host port.
    if docker("port", container, "6379/tcp") != old_binding:
        stop_app(app)
        app = start_app()
    eventually(lambda: api("/withdraw", {"deviceId": removed})[0] == 204)
    stop_app(app)
    docker("restart", container)
    eventually(lambda: redis("PING") == "PONG")
    assert redis("HKEYS", key) == control
    app = start_app()
    eventually(lambda: api()[0] == 200)
    board = api()[1]
    assert [entry["nickname"] for entry in board["feed"]] == ["Calm Bilby"]
    assert board["top"] == {"real": [], "demo": []}
    print("PASS isolated Redis 7.4 AOF, authentication, TTL, outage 503, retry 204, "
          "restart and cold hydration with only the control ticket")
finally:
    try:
        stop_app(app)
    finally:
        docker("rm", "-f", "-v", container)
