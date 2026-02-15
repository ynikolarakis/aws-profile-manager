"""Tests for EventBus functionality."""

import queue as qmod

from backend.event_bus import EventBus


class TestEventBus:
    def test_sse_client_receives_events(self):
        bus = EventBus()
        q = bus.add_sse_client()
        bus.send("test", {"msg": "hello"})
        msg = q.get_nowait()
        assert "event: test" in msg
        assert '"msg": "hello"' in msg or '"msg":"hello"' in msg
        bus.remove_sse_client(q)

    def test_sse_keepalive_format(self):
        """SSE messages follow the standard format."""
        bus = EventBus()
        q = bus.add_sse_client()
        bus.send("identity", {"account": "123"})
        msg = q.get_nowait()
        assert msg.startswith("event: identity\n")
        assert "data: " in msg
        assert msg.endswith("\n\n")
        bus.remove_sse_client(q)

    def test_multiple_clients(self):
        bus = EventBus()
        q1 = bus.add_sse_client()
        q2 = bus.add_sse_client()
        bus.send("test", {"x": 1})
        assert not q1.empty()
        assert not q2.empty()
        bus.remove_sse_client(q1)
        bus.remove_sse_client(q2)

    def test_remove_client(self):
        bus = EventBus()
        q = bus.add_sse_client()
        bus.remove_sse_client(q)
        bus.send("test", {"x": 1})
        assert q.empty()
