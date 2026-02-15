"""API service containing all business logic.

Ported from legacy/app.py L178-389 (Api class).
"""

import json
import os
import subprocess
import sys
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Detect Windows OEM codepage as default for subprocess output decoding
if sys.platform == "win32":
    import ctypes
    _DEFAULT_ENCODING = f"cp{ctypes.windll.kernel32.GetOEMCP()}"
else:
    _DEFAULT_ENCODING = "utf-8"

import boto3
from botocore.exceptions import ClientError, NoCredentialsError, ProfileNotFound

from .aws_config import AWSCfg
from .constants import COMMON_SVCS, PROFILE_NAME_RE, REGIONS, SVC, make_default_svc
from .event_bus import events
from .state_manager import StateManager


class ApiService:
    def __init__(self):
        self.mgr = AWSCfg()
        self.store = StateManager()
        self._active = self.mgr.active()
        self._creds: dict = {}
        self._init_creds()

    def _get_encoding(self) -> str:
        return self.store.data.get("terminal_encoding", "") or _DEFAULT_ENCODING

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
            "terminal_encoding": self._get_encoding(),
            "default_encoding": _DEFAULT_ENCODING,
            "services_map": {
                k: {"icon": v["icon"], "short": v["short"], "color": v["color"], "desc": v.get("desc", ""), "cmds": v["cmds"]}
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
                enc = self._get_encoding()
                for line in iter(proc.stdout.readline, b""):
                    events.send("term", {"type": "output", "text": line.decode(enc, errors="replace")})
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
                    events.send("term", {"type": "output", "text": out.decode(self._get_encoding(), errors="replace")})
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

    def set_encoding(self, encoding: str) -> dict:
        # Validate by attempting a decode
        try:
            b"test".decode(encoding)
        except LookupError:
            return {"error": f"Unknown encoding: {encoding}"}
        self.store.data["terminal_encoding"] = encoding
        self.store.save()
        return {"ok": True, "encoding": encoding}

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
                skip = {"Tax", "Refund", "Credit"}
                for g in r.get("ResultsByTime", [{}])[0].get("Groups", []):
                    sn, cost = g["Keys"][0], float(g["Metrics"]["UnblendedCost"]["Amount"])
                    if cost > 0.001 and sn not in skip:
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

            svc_defs = {}
            for item in found:
                sn = item["name"]
                svc_defs[sn] = SVC.get(sn) or make_default_svc(sn)

            events.send("services", {"svcs": found, "src": src, "profile": profile, "svc_defs": svc_defs})

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
            now = datetime.now(timezone.utc)
            for f in cache_dir.glob("*.json"):
                try:
                    data = json.loads(f.read_text())
                    if "expiresAt" in data:
                        exp = datetime.fromisoformat(data["expiresAt"].replace("Z", "+00:00"))
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

    def _find_sso_token(self, sso_start_url: str) -> tuple[str, str] | None:
        """Find a valid SSO access token from ~/.aws/sso/cache/ matching the given start URL."""
        cache_dir = Path.home() / ".aws" / "sso" / "cache"
        if not cache_dir.exists():
            return None
        now = datetime.now(timezone.utc)
        for f in cache_dir.glob("*.json"):
            try:
                data = json.loads(f.read_text())
                if data.get("startUrl", "").rstrip("/") != sso_start_url.rstrip("/"):
                    continue
                if "expiresAt" not in data or "accessToken" not in data:
                    continue
                exp_str = data["expiresAt"].replace("Z", "+00:00")
                exp = datetime.fromisoformat(exp_str)
                if exp > now:
                    region = data.get("region", "us-east-1")
                    return (data["accessToken"], region)
            except Exception:
                continue
        return None

    def discover_sso_accounts(self, sso_start_url: str | None = None) -> dict:
        # Collect SSO URLs to scan: specific one, or all unique URLs from profiles
        urls: list[str] = []
        if sso_start_url:
            urls = [sso_start_url]
        else:
            seen: set[str] = set()
            for _n, p in self.mgr.profiles.items():
                if p.get("type") == "sso" and p.get("sso_start_url"):
                    u = p["sso_start_url"].rstrip("/")
                    if u not in seen:
                        seen.add(u)
                        urls.append(p["sso_start_url"])
        if not urls:
            return {"error": "No SSO profiles found. Create an SSO profile first."}

        def _go():
            all_results = []
            errors = []
            for url in urls:
                try:
                    token_result = self._find_sso_token(url)
                    if not token_result:
                        errors.append(f"Session expired for {url}")
                        continue
                    access_token, region = token_result
                    sso = boto3.client("sso", region_name=region)

                    # Paginate list_accounts
                    accounts = []
                    paginator = sso.get_paginator("list_accounts")
                    for page in paginator.paginate(accessToken=access_token):
                        accounts.extend(page.get("accountList", []))

                    # For each account, get roles
                    for acct in accounts:
                        account_id = acct["accountId"]
                        account_name = acct.get("accountName", account_id)
                        account_email = acct.get("emailAddress", "")
                        role_paginator = sso.get_paginator("list_account_roles")
                        for role_page in role_paginator.paginate(accessToken=access_token, accountId=account_id):
                            for role in role_page.get("roleList", []):
                                role_name = role["roleName"]
                                suggested = f"{account_name}-{role_name}".lower().replace(" ", "-")
                                already_exists = any(
                                    p.get("sso_account_id") == account_id and p.get("sso_role_name") == role_name
                                    for p in self.mgr.profiles.values()
                                )
                                all_results.append({
                                    "account_id": account_id,
                                    "account_name": account_name,
                                    "account_email": account_email,
                                    "role_name": role_name,
                                    "suggested_profile_name": suggested,
                                    "already_exists": already_exists,
                                    "sso_start_url": url,
                                    "sso_region": region,
                                })
                except ClientError as e:
                    code = e.response.get("Error", {}).get("Code", "")
                    if code == "UnauthorizedException":
                        errors.append(f"Session expired for {url}")
                    else:
                        errors.append(str(e)[:100])
                except Exception as e:
                    errors.append(str(e)[:100])

            if all_results:
                error_msg = "; ".join(errors) if errors else None
                events.send("sso_accounts", {"accounts": all_results, "error": error_msg})
            elif errors:
                events.send("sso_accounts", {"accounts": [], "error": "; ".join(errors)})
            else:
                events.send("sso_accounts", {"accounts": [], "error": None})

        threading.Thread(target=_go, daemon=True).start()
        return {"ok": True}

    def import_sso_accounts(self, accounts: list[dict]) -> dict:
        imported = 0
        for acct in accounts:
            name = acct.get("name", "").strip()
            err = self.validate_name(name)
            if err:
                continue
            # Skip if profile already exists with same name
            if name in self.mgr.profiles:
                continue
            self.mgr.profiles[name] = {
                "name": name,
                "type": "sso",
                "sso_start_url": acct.get("sso_start_url", ""),
                "sso_region": acct.get("sso_region", ""),
                "sso_account_id": acct.get("sso_account_id", ""),
                "sso_role_name": acct.get("sso_role_name", ""),
                "region": acct.get("region", "eu-central-1"),
                "output": "json",
            }
            imported += 1
        if imported > 0:
            self.mgr.save()
        return {"ok": True, "count": imported}

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
        self.mgr.save()
        self.store.save()
        return {"ok": True, "count": len(profiles)}
