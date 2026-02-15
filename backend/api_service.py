"""API service containing all business logic.

Ported from legacy/app.py L178-389 (Api class).
"""

import json
import os
import subprocess
import sys
import threading
from datetime import datetime, timedelta
from pathlib import Path

import boto3
from botocore.exceptions import ClientError, NoCredentialsError, ProfileNotFound

from .aws_config import AWSCfg
from .constants import COMMON_SVCS, PROFILE_NAME_RE, REGIONS, SVC
from .event_bus import events
from .state_manager import StateManager


class ApiService:
    def __init__(self):
        self.mgr = AWSCfg()
        self.store = StateManager()
        self._active = self.mgr.active()
        self._creds: dict = {}
        self._init_creds()

    def _init_creds(self):
        prof = self.mgr.profiles.get(self._active, {})
        if prof.get("type") == "credentials":
            for k in ["aws_access_key_id", "aws_secret_access_key", "aws_session_token"]:
                if prof.get(k):
                    self._creds[k] = prof[k]

    def _make_env(self, profile: str | None = None) -> dict:
        profile = profile or self._active
        env = os.environ.copy()
        env["AWS_PROFILE"] = profile
        prof = self.mgr.profiles.get(profile, {})

        if prof.get("type") == "credentials" and prof.get("aws_access_key_id"):
            env["AWS_ACCESS_KEY_ID"] = prof["aws_access_key_id"]
            env["AWS_SECRET_ACCESS_KEY"] = prof.get("aws_secret_access_key", "")
            if prof.get("aws_session_token"):
                env["AWS_SESSION_TOKEN"] = prof["aws_session_token"]
            env["AWS_DEFAULT_REGION"] = prof.get("region", "us-east-1")
            env.pop("AWS_PROFILE", None)
        elif profile == self._active and self._creds.get("aws_access_key_id"):
            env["AWS_ACCESS_KEY_ID"] = self._creds["aws_access_key_id"]
            env["AWS_SECRET_ACCESS_KEY"] = self._creds.get("aws_secret_access_key", "")
            if self._creds.get("aws_session_token"):
                env["AWS_SESSION_TOKEN"] = self._creds["aws_session_token"]
            env["AWS_DEFAULT_REGION"] = prof.get("region", "us-east-1")
            env.pop("AWS_PROFILE", None)

        return env

    def get_state(self) -> dict:
        profiles = {}
        for n, p in self.mgr.profiles.items():
            d = {**p}
            if d.get("aws_secret_access_key"):
                d["has_keys"] = True
                d["aws_secret_access_key"] = "••••••••"
            profiles[n] = d
        return {
            "profiles": profiles,
            "categories": self.store.get_categories(),
            "profile_cat": self.store.data.get("profile_cat", {}),
            "favorites": self.store.get_favorites(),
            "theme": self.store.get_theme(),
            "active": self._active,
            "collapsed": self.store.data.get("collapsed", {}),
            "regions": REGIONS,
            "services_map": {
                k: {"icon": v["icon"], "short": v["short"], "color": v["color"], "cmds": v["cmds"]}
                for k, v in SVC.items()
            },
        }

    def get_logo(self) -> str | None:
        for p in [Path(__file__).parent / "logo.png", Path(__file__).parent.parent / "legacy" / "logo.png"]:
            if p.exists():
                try:
                    import base64
                    return base64.b64encode(p.read_bytes()).decode()
                except Exception:
                    pass
        return None

    def validate_name(self, name: str) -> str | None:
        if not name:
            return "Name is required"
        if not PROFILE_NAME_RE.match(name):
            return "Only letters, numbers, dots, hyphens, underscores. No spaces."
        return None

    def save_profile(self, data: dict) -> dict:
        orig = data.pop("_orig_name", "")
        name = data.get("name", "").strip()
        err = self.validate_name(name)
        if err:
            return {"error": err}

        real = orig or name
        if real in self.mgr.profiles:
            old = self.mgr.profiles[real]
            if data.get("type") == "credentials" and not data.get("aws_secret_access_key") and old.get("aws_secret_access_key"):
                data["aws_secret_access_key"] = old["aws_secret_access_key"]

        if orig and orig != name:
            self.mgr.profiles.pop(orig, None)
            self.store.unset_profile_cat(orig)

        self.mgr.profiles[name] = data
        cat_id = data.pop("_cat_id", None)
        if cat_id == "__none__":
            self.store.unset_profile_cat(name)
        elif cat_id:
            self.store.set_profile_cat(name, cat_id)

        try:
            self.mgr.save()
        except Exception as e:
            return {"error": f"Saved in memory but failed to write AWS files: {e}"}
        return {"ok": True}

    def delete_profile(self, name: str) -> dict:
        self.mgr.profiles.pop(name, None)
        self.store.unset_profile_cat(name)
        self.mgr.save()
        return {"ok": True}

    def activate(self, name: str) -> dict:
        self._active = name
        os.environ["AWS_PROFILE"] = name
        self._creds = {}
        prof = self.mgr.profiles.get(name, {})
        if prof.get("type") == "credentials":
            for k in ["aws_access_key_id", "aws_secret_access_key", "aws_session_token"]:
                v = prof.get(k, "")
                if v and not v.startswith("••"):
                    self._creds[k] = v
        self._bg_identity(name)
        return {"ok": True}

    def run_command(self, cmd: str) -> dict:
        profile = self._active

        def _run():
            try:
                env = self._make_env(profile)
                run_cmd = cmd
                if cmd.strip().startswith("aws ") and "--profile" not in cmd and not self._creds:
                    parts = cmd.split()
                    if len(parts) >= 2:
                        parts.insert(2, f"--profile {profile}")
                        run_cmd = " ".join(parts)
                kw = {"shell": True, "stdout": subprocess.PIPE, "stderr": subprocess.STDOUT, "env": env}
                if sys.platform == "win32":
                    kw["creationflags"] = 0x08000000
                proc = subprocess.Popen(run_cmd, **kw)
                for line in iter(proc.stdout.readline, b""):
                    events.send("term", {"type": "output", "text": line.decode("utf-8", errors="replace")})
                proc.wait()
                events.send("term", {"type": "done", "code": proc.returncode})
            except FileNotFoundError:
                events.send("term", {"type": "output", "text": "ERROR: aws CLI not found in PATH\n"})
                events.send("term", {"type": "done", "code": 1})
            except Exception as e:
                events.send("term", {"type": "output", "text": f"ERROR: {str(e)[:80]}\n"})
                events.send("term", {"type": "done", "code": 1})

        threading.Thread(target=_run, daemon=True).start()
        return {"ok": True}

    def bulk_run(self, profiles: list[str], cmd: str) -> dict:
        def _run():
            for p in profiles:
                events.send("term", {"type": "output", "text": f"\n{'=' * 50}\n  Profile: {p}\n{'=' * 50}\n"})
                try:
                    env = self._make_env(p)
                    run_cmd = cmd
                    prof = self.mgr.profiles.get(p, {})
                    if cmd.strip().startswith("aws ") and "--profile" not in cmd and not prof.get("aws_access_key_id"):
                        parts = cmd.split()
                        if len(parts) >= 2:
                            parts.insert(2, f"--profile {p}")
                            run_cmd = " ".join(parts)
                    kw = {"shell": True, "stdout": subprocess.PIPE, "stderr": subprocess.STDOUT, "env": env}
                    if sys.platform == "win32":
                        kw["creationflags"] = 0x08000000
                    proc = subprocess.Popen(run_cmd, **kw)
                    out, _ = proc.communicate(timeout=30)
                    events.send("term", {"type": "output", "text": out.decode("utf-8", errors="replace")})
                    if proc.returncode == 0:
                        events.send("term", {"type": "output", "text": "  done\n"})
                    else:
                        events.send("term", {"type": "output", "text": f"  exit {proc.returncode}\n"})
                except Exception as e:
                    events.send("term", {"type": "output", "text": f"  {str(e)[:60]}\n"})
            events.send("term", {"type": "done", "code": 0})

        threading.Thread(target=_run, daemon=True).start()
        return {"ok": True}

    def add_category(self, name: str, color: str) -> dict:
        return {"ok": True, "id": self.store.add_category(name, color)}

    def edit_category(self, cid: str, name: str, color: str) -> dict:
        self.store.edit_category(cid, name, color)
        return {"ok": True}

    def delete_category(self, cid: str) -> dict:
        self.store.delete_category(cid)
        return {"ok": True}

    def set_profile_category(self, profile: str, cat_id: str) -> dict:
        if cat_id == "__none__":
            self.store.unset_profile_cat(profile)
        else:
            self.store.set_profile_cat(profile, cat_id)
        return {"ok": True}

    def toggle_collapsed(self, cid: str) -> dict:
        cur = self.store.is_collapsed(cid)
        self.store.set_collapsed(cid, not cur)
        return {"ok": True, "collapsed": not cur}

    def add_favorite(self, label: str, cmd: str) -> dict:
        self.store.add_favorite(label, cmd)
        return {"ok": True}

    def remove_favorite(self, cmd: str) -> dict:
        self.store.remove_favorite(cmd)
        return {"ok": True}

    def save_config(self) -> dict:
        try:
            self.mgr.save()
            return {"ok": True}
        except Exception as e:
            return {"error": str(e)}

    def reload_config(self) -> dict:
        self.mgr.load()
        self.store.load()
        self._active = self.mgr.active()
        self._creds = {}
        self._init_creds()
        return self.get_state()

    def set_theme(self, theme: str) -> dict:
        self.store.data["theme"] = theme
        self.store.save()
        return {"ok": True}

    def discover_services(self, profile: str | None = None) -> dict:
        profile = profile or self._active

        def _go():
            found = []
            src = "offline"
            try:
                s = boto3.Session(profile_name=profile)
                ce = s.client("ce", region_name="us-east-1")
                end = datetime.now().date()
                start = end - timedelta(days=30)
                r = ce.get_cost_and_usage(
                    TimePeriod={"Start": start.strftime("%Y-%m-%d"), "End": end.strftime("%Y-%m-%d")},
                    Granularity="MONTHLY",
                    Metrics=["UnblendedCost"],
                    GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
                )
                for g in r.get("ResultsByTime", [{}])[0].get("Groups", []):
                    sn, cost = g["Keys"][0], float(g["Metrics"]["UnblendedCost"]["Amount"])
                    if cost > 0.001 and sn in SVC:
                        found.append({"name": sn, "cost": round(cost, 2)})
                found.sort(key=lambda x: x["cost"], reverse=True)
                if found:
                    src = "cost"
            except Exception:
                pass

            if not found:
                try:
                    s = boto3.Session(profile_name=profile)
                    s.client("sts").get_caller_identity()
                    for sn in COMMON_SVCS:
                        if sn in SVC:
                            found.append({"name": sn, "cost": None})
                    src = "sts"
                except Exception:
                    pass

            if not found:
                for sn in list(SVC.keys())[:8]:
                    found.append({"name": sn, "cost": None})

            events.send("services", {"svcs": found, "src": src, "profile": profile})

        threading.Thread(target=_go, daemon=True).start()
        return {"ok": True}

    def _bg_identity(self, profile: str):
        def _go():
            try:
                s = boto3.Session(profile_name=profile)
                i = s.client("sts").get_caller_identity()
                events.send("identity", {"account": i.get("Account", ""), "arn": i.get("Arn", ""), "error": None})
            except Exception as e:
                events.send("identity", {"account": "", "arn": "", "error": str(e)[:80]})

        threading.Thread(target=_go, daemon=True).start()

    def get_cost(self, profile: str, year: int, month: int) -> dict:
        def _go():
            try:
                s = boto3.Session(profile_name=profile)
                ce = s.client("ce", region_name="us-east-1")
                start = f"{year:04d}-{month:02d}-01"
                end = f"{year + 1:04d}-01-01" if month == 12 else f"{year:04d}-{month + 1:02d}-01"
                r = ce.get_cost_and_usage(
                    TimePeriod={"Start": start, "End": end},
                    Granularity="MONTHLY",
                    Metrics=["UnblendedCost"],
                    GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
                )
                svcs = []
                total = 0
                for g in r.get("ResultsByTime", [{}])[0].get("Groups", []):
                    sn = g["Keys"][0]
                    cost = float(g["Metrics"]["UnblendedCost"]["Amount"])
                    if cost > 0.001:
                        svcs.append({"name": sn, "cost": round(cost, 2)})
                        total += cost
                svcs.sort(key=lambda x: x["cost"], reverse=True)
                events.send("cost_data", {"services": svcs, "total": round(total, 2), "error": None})
            except Exception as e:
                events.send("cost_data", {"services": [], "total": 0, "error": str(e)[:60]})

        threading.Thread(target=_go, daemon=True).start()
        return {"ok": True}

    def fetch_cost_badges(self) -> dict:
        for n in self.mgr.profiles:
            self._bg_badge(n)
        return {"ok": True}

    def _bg_badge(self, profile: str):
        def _go():
            try:
                s = boto3.Session(profile_name=profile)
                ce = s.client("ce", region_name="us-east-1")
                end = datetime.now().date()
                start = end - timedelta(days=30)
                r = ce.get_cost_and_usage(
                    TimePeriod={"Start": start.strftime("%Y-%m-%d"), "End": end.strftime("%Y-%m-%d")},
                    Granularity="MONTHLY",
                    Metrics=["UnblendedCost"],
                )
                total = sum(
                    float(rt.get("Total", {}).get("UnblendedCost", {}).get("Amount", 0))
                    for rt in r.get("ResultsByTime", [])
                )
                events.send("cost_badge", {"profile": profile, "cost": f"${total:.2f}"})
            except Exception:
                pass

        threading.Thread(target=_go, daemon=True).start()

    def check_sso_status(self) -> dict:
        cache_dir = Path.home() / ".aws" / "sso" / "cache"
        results: dict = {}
        if cache_dir.exists():
            now = datetime.now()
            for f in cache_dir.glob("*.json"):
                try:
                    data = json.loads(f.read_text())
                    if "expiresAt" in data:
                        exp = datetime.fromisoformat(data["expiresAt"].replace("Z", "").split("+")[0])
                        if exp > now:
                            for n, p in self.mgr.profiles.items():
                                if p.get("type") == "sso":
                                    results[n] = "active"
                except Exception:
                    continue
        for n, p in self.mgr.profiles.items():
            if p.get("type") == "sso" and n not in results:
                results[n] = "expired"
        return results

    def export_json(self) -> dict:
        return {
            "profiles": {n: {k: v for k, v in p.items()} for n, p in self.mgr.profiles.items()},
            "categories": self.store.get_categories(),
            "profile_cat": self.store.data.get("profile_cat", {}),
        }

    def import_json(self, data: dict) -> dict:
        profiles = data.get("profiles", {})
        for n, p in profiles.items():
            p["name"] = n
            self.mgr.profiles[n] = p
        for cid, cdata in data.get("categories", {}).items():
            if cid not in self.store.data.setdefault("categories", {}):
                self.store.data["categories"][cid] = cdata
        for pn, cid in data.get("profile_cat", {}).items():
            self.store.data.setdefault("profile_cat", {})[pn] = cid
        self.store.save()
        return {"ok": True, "count": len(profiles)}
