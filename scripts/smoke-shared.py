#!/usr/bin/env python3
"""Exercise real HTTP auth, invitations and access checks against an isolated database."""
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DLL = ROOT / "src/Workdesk.Server/bin/Release/net10.0/Workdesk.Server.dll"
assert DLL.exists(), "Run dotnet build -c Release first"
with socket.socket() as listener:
    listener.bind(("127.0.0.1", 0))
    port = listener.getsockname()[1]
BASE = f"http://127.0.0.1:{port}"
PASSWORD = secrets.token_urlsafe(24)


def request(path, data=None, cookie="", expected=200, secure=True, csrf=True):
    headers = {"Content-Type": "application/json"}
    if secure:
        headers["X-Forwarded-Proto"] = "https"
    if csrf:
        headers["X-Workdesk"] = "1"
    if cookie:
        headers["Cookie"] = cookie
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(BASE + path, body, headers)
    try:
        response = urllib.request.urlopen(req, timeout=5)
    except urllib.error.HTTPError as error:
        response = error
    raw = response.read()
    assert response.status == expected, f"{path}: expected {expected}, got {response.status}"
    value = json.loads(raw) if raw else None
    return value, response.headers


with tempfile.TemporaryDirectory(prefix="workdesk-http-") as directory:
    key = Path(directory) / "master-key"
    key.write_bytes(secrets.token_bytes(32))
    env = {**os.environ, "WORKDESK_DATA_DIR": str(Path(directory) / "data"),
           "WORKDESK_URLS": BASE, "AllowedHosts": "127.0.0.1",
           "Workdesk__AllowedSourceHosts": "api.github.com", "Workdesk__Redis": "",
           "WORKDESK_MASTER_KEY_FILE": str(key)}
    process = None

    def stop():
        global process
        if process is not None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
            process = None

    def start(shared):
        global process
        env["Workdesk__SharedMode"] = str(shared).lower()
        process = subprocess.Popen(["dotnet", str(DLL)], cwd=ROOT, env=env,
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(100):
            assert process.poll() is None, "Server exited during startup"
            try:
                request("/api/health")
                return
            except (urllib.error.URLError, ConnectionError):
                time.sleep(0.1)
        raise AssertionError("Server did not become ready")

    try:
        start(False)
        _, headers = request("/api/Auth/setup", {"name": "Owner", "login": "owner", "email": "owner@example.test", "password": PASSWORD})
        local_owner = headers["Set-Cookie"].split(";", 1)[0]
        session, _ = request("/api/Auth/session", cookie=local_owner)
        assert session["authenticated"]
        request("/api/Notes", cookie=local_owner)
        _, headers = request("/api/Auth/logout", {}, local_owner)
        assert "expires=" in headers["Set-Cookie"].lower()
        session, _ = request("/api/Auth/session")
        assert not session["authenticated"] and not session["setupRequired"]
        request("/api/Notes", expected=401)
        request("/api/TelegramLink", {}, expected=401)
        stop()
        start(False)
        request("/api/Notes", expected=401)
        _, headers = request("/api/Auth/login", {"login": "owner", "password": PASSWORD})
        request("/api/Notes", cookie=headers["Set-Cookie"].split(";", 1)[0])
        stop()
        start(True)
        request("/api/Notes", expected=403, secure=False)
        request("/api/Notes", expected=401)
        _, headers = request("/api/Auth/login", {"login": "owner", "password": PASSWORD})
        cookie_header = headers["Set-Cookie"]
        assert all(flag.lower() in cookie_header.lower() for flag in ("secure", "httponly", "samesite=strict"))
        owner = cookie_header.split(";", 1)[0]
        request("/api/Notes/save", {"title": "Private", "body": "private"}, owner, expected=403, csrf=False)
        space, _ = request("/api/Team/save", {"name": "HTTP test"}, owner)
        invitation, _ = request(f"/api/Team/{space['id']}/invite", {"role": "reader"}, owner)
        signup = {"token": invitation["token"], "name": "Reader", "login": "reader", "email": "reader@example.test", "password": PASSWORD}
        account, headers = request("/api/Auth/accept", signup)
        reader = headers["Set-Cookie"].split(";", 1)[0]
        request("/api/Auth/accept", signup, expected=410)
        request("/api/Notes/save", {"title": "Private", "body": "private"}, owner)
        shared, _ = request("/api/Notes/save", {"title": "Shared", "body": "original", "workspaceId": space["id"]}, owner)
        notes, _ = request("/api/Notes", cookie=reader)
        assert len(notes) == 1 and notes[0]["id"] == shared["id"] and not notes[0]["canEdit"]
        request("/api/Notes/save", {**shared, "body": "forbidden"}, reader, expected=403)
        request(f"/api/Team/{space['id']}/members/{account['userId']}", {"role": "removed"}, owner)
        assert request("/api/Notes", cookie=reader)[0] == []
        request(f"/api/Notes/{shared['id']}/history", cookie=reader, expected=404)
        request(f"/api/Team/{space['id']}/invite", {"role": "editor", "login": "reader"}, owner)
        pending, _ = request("/api/Team/invitations", cookie=reader)
        accept_path = f"/api/Team/invitations/{pending[0]['id']}/accept"
        request(accept_path, {}, owner, expected=410)
        request(accept_path, {}, reader)
        updated, _ = request("/api/Notes/save", {**shared, "body": "edited"}, reader)
        assert updated["body"] == "edited"
        # The authentication limiter must reject sustained invalid logins.
        statuses = []
        for _ in range(12):
            try:
                req = urllib.request.Request(BASE + "/api/Auth/login", json.dumps({"login": "absent", "password": PASSWORD}).encode(),
                                             {"X-Forwarded-Proto": "https", "X-Workdesk": "1", "Content-Type": "application/json"})
                urllib.request.urlopen(req, timeout=5)
            except urllib.error.HTTPError as error:
                statuses.append(error.code)
        assert 429 in statuses and all(code in (401, 429) for code in statuses)
        print("HTTP smoke passed: local logout/restart/login, HTTPS/auth cookies, CSRF, isolation, roles, revocation, invitations, rate limit")
    finally:
        stop()
