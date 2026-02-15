"""Event bus supporting both SSE (sync Queue) and WebSocket (asyncio.Queue).

Ported from legacy/app.py L158-174 with WebSocket support added.
"""

import asyncio
import json
import queue as qmod
import threading


class EventBus:
    def __init__(self):
        self.sse_clients: list[qmod.Queue] = []
        self.ws_clients: list[asyncio.Queue] = []
        self.lock = threading.Lock()

    # --- SSE (sync) ---
    def add_sse_client(self) -> qmod.Queue:
        q = qmod.Queue()
        with self.lock:
            self.sse_clients.append(q)
        return q

    def remove_sse_client(self, q: qmod.Queue):
        with self.lock:
            try:
                self.sse_clients.remove(q)
            except ValueError:
                pass

    # --- WebSocket (async) ---
    def add_ws_client(self) -> asyncio.Queue:
        q = asyncio.Queue()
        with self.lock:
            self.ws_clients.append(q)
        return q

    def remove_ws_client(self, q: asyncio.Queue):
        with self.lock:
            try:
                self.ws_clients.remove(q)
            except ValueError:
                pass

    # --- Broadcast ---
    def send(self, event: str, data: dict):
        msg = json.dumps(data)
        sse_msg = f"event: {event}\ndata: {msg}\n\n"
        ws_msg = json.dumps({"event": event, "data": data})

        with self.lock:
            for q in self.sse_clients:
                try:
                    q.put_nowait(sse_msg)
                except Exception:
                    pass
            for q in self.ws_clients:
                try:
                    q.put_nowait(ws_msg)
                except Exception:
                    pass


events = EventBus()
