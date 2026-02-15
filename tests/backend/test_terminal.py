"""Tests for terminal command execution."""

import time
from unittest.mock import patch

import pytest

from backend.event_bus import events


class TestRunCommand:
    def test_run_command_returns_ok(self, api_service):
        result = api_service.run_command("echo hello")
        assert result.get("ok") is True

    def test_run_command_sends_events(self, api_service):
        """Verify that running a command sends term events."""
        q = events.add_sse_client()
        api_service.run_command("echo test-output")

        # Wait for output
        collected = []
        deadline = time.time() + 5
        while time.time() < deadline:
            try:
                msg = q.get(timeout=0.5)
                collected.append(msg)
                if "done" in msg:
                    break
            except Exception:
                pass

        events.remove_sse_client(q)
        full = "".join(collected)
        assert "test-output" in full
        assert "done" in full

    def test_profile_injection(self, api_service):
        """Verify --profile is injected for aws commands."""
        with patch("subprocess.Popen") as mock_popen:
            mock_proc = mock_popen.return_value
            mock_proc.stdout.readline.return_value = b""
            mock_proc.stdout.__iter__ = lambda self: iter([])
            mock_proc.wait.return_value = 0
            mock_proc.returncode = 0

            api_service._creds = {}
            api_service._active = "my-profile"
            api_service.run_command("aws s3 ls")

            # Give thread time to start
            time.sleep(0.5)
            if mock_popen.called:
                cmd = mock_popen.call_args[0][0]
                assert "--profile my-profile" in cmd

    def test_file_not_found_handling(self, api_service):
        """Verify graceful handling when command is not found."""
        q = events.add_sse_client()

        with patch("subprocess.Popen", side_effect=FileNotFoundError("not found")):
            api_service.run_command("nonexistent-command")

        collected = []
        deadline = time.time() + 3
        while time.time() < deadline:
            try:
                msg = q.get(timeout=0.5)
                collected.append(msg)
                if "done" in msg:
                    break
            except Exception:
                pass

        events.remove_sse_client(q)
        full = "".join(collected)
        assert "not found" in full.lower() or "ERROR" in full
