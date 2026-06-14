from __future__ import annotations

import cgi
import json
import posixpath
import re
import sqlite3
import sys
import uuid
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
DB_PATH = DATA_DIR / "ticket_requests.db"
MAX_UPLOAD_SIZE = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".pdf"}


def ensure_storage() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS ticket_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id TEXT NOT NULL UNIQUE,
                full_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT NOT NULL,
                ticket_type TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                payment_reference TEXT NOT NULL,
                is_group INTEGER NOT NULL,
                group_name TEXT,
                group_members TEXT,
                notes TEXT,
                screenshot_original_name TEXT NOT NULL,
                screenshot_saved_name TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )


def json_response(handler: "TicketRequestHandler", status: int, payload: dict) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def make_request_id() -> str:
    now = datetime.now(timezone.utc)
    return f"TX-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


def sanitize_filename(name: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9._-]+", "-", name).strip("-")
    return safe or "upload"


class TicketRequestHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        parsed = urlparse(path)
        path = parsed.path
        path = posixpath.normpath(path)
        parts = [part for part in path.split("/") if part]
        resolved = BASE_DIR
        for part in parts:
            if part in {".", ".."}:
                continue
            resolved = resolved / part
        return str(resolved)

    def do_GET(self) -> None:
        if self.path in {"/", ""}:
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self) -> None:
        if self.path == "/api/ticket-requests":
            self.handle_ticket_request()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Endpoint not found")

    def handle_ticket_request(self) -> None:
        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            json_response(self, HTTPStatus.BAD_REQUEST, {"error": "Expected multipart form submission."})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            json_response(self, HTTPStatus.BAD_REQUEST, {"error": "Invalid request length."})
            return

        if content_length <= 0:
            json_response(self, HTTPStatus.BAD_REQUEST, {"error": "Empty request body."})
            return

        if content_length > MAX_UPLOAD_SIZE + 100_000:
            json_response(self, HTTPStatus.BAD_REQUEST, {"error": "Request is too large."})
            return

        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={
                "REQUEST_METHOD": "POST",
                "CONTENT_TYPE": content_type,
                "CONTENT_LENGTH": str(content_length),
            },
        )

        def get_value(name: str) -> str:
            value = form.getfirst(name, "")
            return value.strip()

        full_name = get_value("full_name")
        phone = get_value("phone")
        email = get_value("email")
        ticket_type = get_value("ticket_type")
        payment_reference = get_value("payment_reference")
        notes = get_value("notes")
        group_name = get_value("group_name")
        group_members = get_value("group_members")
        is_group = get_value("is_group") == "on"

        try:
            quantity = int(get_value("quantity") or "0")
        except ValueError:
            quantity = 0

        required_fields = {
            "full_name": full_name,
            "phone": phone,
            "email": email,
            "ticket_type": ticket_type,
            "payment_reference": payment_reference,
        }
        missing = [name for name, value in required_fields.items() if not value]
        if missing:
            json_response(self, HTTPStatus.BAD_REQUEST, {"error": f"Missing required fields: {', '.join(missing)}"})
            return

        if quantity < 1 or quantity > 20:
            json_response(self, HTTPStatus.BAD_REQUEST, {"error": "Quantity must be between 1 and 20."})
            return

        if is_group and not group_members:
            json_response(self, HTTPStatus.BAD_REQUEST, {"error": "Group members are required for group bookings."})
            return

        upload_field = form["payment_screenshot"] if "payment_screenshot" in form else None
        if upload_field is None or not getattr(upload_field, "filename", ""):
            json_response(self, HTTPStatus.BAD_REQUEST, {"error": "Payment screenshot is required."})
            return

        original_name = Path(upload_field.filename).name
        extension = Path(original_name).suffix.lower()
        if extension not in ALLOWED_EXTENSIONS:
            json_response(self, HTTPStatus.BAD_REQUEST, {"error": "Unsupported file type."})
            return

        file_data = upload_field.file.read()
        if not file_data:
            json_response(self, HTTPStatus.BAD_REQUEST, {"error": "Uploaded file is empty."})
            return

        if len(file_data) > MAX_UPLOAD_SIZE:
            json_response(self, HTTPStatus.BAD_REQUEST, {"error": "Uploaded file exceeds the 10 MB limit."})
            return

        saved_name = f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}_{sanitize_filename(original_name)}"
        save_path = UPLOAD_DIR / saved_name
        save_path.write_bytes(file_data)

        created_at = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M:%S")
        request_id = make_request_id()

        with sqlite3.connect(DB_PATH) as connection:
            connection.execute(
                """
                INSERT INTO ticket_requests (
                    request_id,
                    full_name,
                    phone,
                    email,
                    ticket_type,
                    quantity,
                    payment_reference,
                    is_group,
                    group_name,
                    group_members,
                    notes,
                    screenshot_original_name,
                    screenshot_saved_name,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    request_id,
                    full_name,
                    phone,
                    email,
                    ticket_type,
                    quantity,
                    payment_reference,
                    1 if is_group else 0,
                    group_name,
                    group_members,
                    notes,
                    original_name,
                    saved_name,
                    created_at,
                ),
            )

        json_response(
            self,
            HTTPStatus.CREATED,
            {
                "ok": True,
                "request_id": request_id,
                "created_at": created_at,
            },
        )


def main() -> None:
    ensure_storage()
    host = "127.0.0.1"
    port = 8000
    if len(sys.argv) > 1:
        port = int(sys.argv[1])

    server = ThreadingHTTPServer((host, port), TicketRequestHandler)
    print(f"Serving TEDx site at http://{host}:{port}")
    print(f"Ticket uploads: {UPLOAD_DIR}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
