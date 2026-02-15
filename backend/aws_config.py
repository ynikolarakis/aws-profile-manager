"""AWS CLI config/credentials file manager.

Ported from legacy/app.py L107-156 (AWSCfg class).
"""

import configparser
import shutil
from datetime import datetime

from .constants import AWS_DIR, CONFIG_FILE, CREDENTIALS_FILE


class AWSCfg:
    def __init__(self):
        self.profiles: dict[str, dict] = {}
        self.load()

    def load(self):
        self.profiles = {}
        cfg = configparser.ConfigParser()
        crd = configparser.ConfigParser()
        if CONFIG_FILE.exists():
            cfg.read(str(CONFIG_FILE))
        if CREDENTIALS_FILE.exists():
            crd.read(str(CREDENTIALS_FILE))

        for s in cfg.sections():
            n = s.replace("profile ", "") if s.startswith("profile ") else s
            p = {
                "name": n,
                "region": cfg.get(s, "region", fallback="us-east-1"),
                "output": cfg.get(s, "output", fallback="json"),
                "type": "credentials",
            }
            if cfg.has_option(s, "sso_start_url") or cfg.has_option(s, "sso_session"):
                p["type"] = "sso"
                for k in ["sso_start_url", "sso_region", "sso_account_id", "sso_role_name", "sso_session"]:
                    p[k] = cfg.get(s, k, fallback="")
            elif cfg.has_option(s, "role_arn"):
                p["type"] = "role"
                for k in ["role_arn", "source_profile", "external_id"]:
                    p[k] = cfg.get(s, k, fallback="")
            self.profiles[n] = p

        for s in crd.sections():
            if s not in self.profiles:
                self.profiles[s] = {
                    "name": s,
                    "region": "us-east-1",
                    "output": "json",
                    "type": "credentials",
                }
            self.profiles[s]["type"] = "credentials"
            for k in ["aws_access_key_id", "aws_secret_access_key", "aws_session_token"]:
                self.profiles[s][k] = crd.get(s, k, fallback="")

        if not self.profiles:
            self.profiles["default"] = {
                "name": "default",
                "type": "credentials",
                "region": "eu-central-1",
                "output": "json",
            }

    def save(self):
        AWS_DIR.mkdir(exist_ok=True)
        c = configparser.ConfigParser()
        cr = configparser.ConfigParser()

        for n, p in self.profiles.items():
            s = "default" if n == "default" else f"profile {n}"
            c[s] = {
                "region": p.get("region", "us-east-1"),
                "output": p.get("output", "json"),
            }
            if p["type"] == "sso":
                for k in ["sso_start_url", "sso_region", "sso_account_id", "sso_role_name", "sso_session"]:
                    if p.get(k):
                        c[s][k] = p[k]
            elif p["type"] == "role":
                for k in ["role_arn", "source_profile", "external_id"]:
                    if p.get(k):
                        c[s][k] = p[k]
            if p["type"] == "credentials":
                cr[n] = {}
                for k in ["aws_access_key_id", "aws_secret_access_key", "aws_session_token"]:
                    if p.get(k):
                        cr[n][k] = p[k]

        # Create timestamped backups before writing
        for f in [CONFIG_FILE, CREDENTIALS_FILE]:
            if f.exists():
                try:
                    shutil.copy2(f, f.with_suffix(f".bak.{datetime.now().strftime('%Y%m%d_%H%M%S')}"))
                except Exception:
                    pass

        with open(CONFIG_FILE, "w") as f:
            c.write(f)
        with open(CREDENTIALS_FILE, "w") as f:
            cr.write(f)

    def active(self) -> str:
        import os
        n = os.environ.get("AWS_PROFILE", "default")
        if n in self.profiles:
            return n
        if self.profiles:
            return list(self.profiles.keys())[0]
        return "default"
