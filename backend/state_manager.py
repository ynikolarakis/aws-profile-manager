"""State manager for categories, favorites, theme, collapsed state.

Ported from legacy/app.py L70-105 (StateManager class).
"""

import json
import time

from .constants import AWS_DIR, STATE_FILE


class StateManager:
    def __init__(self):
        self.data: dict = {
            "categories": {},
            "profile_cat": {},
            "favorites": [],
            "theme": "dark",
            "collapsed": {},
        }
        self.load()

    def load(self):
        if STATE_FILE.exists():
            try:
                with open(STATE_FILE) as f:
                    self.data.update(json.load(f))
            except Exception:
                pass

    def save(self):
        AWS_DIR.mkdir(exist_ok=True)
        with open(STATE_FILE, "w") as f:
            json.dump(self.data, f, indent=2)

    def get_categories(self) -> dict:
        return self.data.get("categories", {})

    def add_category(self, name: str, color: str) -> str:
        cid = f"cat_{int(time.time() * 1000)}"
        self.data.setdefault("categories", {})[cid] = {
            "name": name,
            "color": color,
            "order": len(self.data.get("categories", {})),
        }
        self.save()
        return cid

    def edit_category(self, cid: str, name: str, color: str):
        cats = self.data.get("categories", {})
        if cid in cats:
            cats[cid]["name"] = name
            cats[cid]["color"] = color
            self.save()

    def delete_category(self, cid: str):
        self.data.get("categories", {}).pop(cid, None)
        pm = self.data.get("profile_cat", {})
        for pn in list(pm):
            if pm[pn] == cid:
                del pm[pn]
        self.data.get("collapsed", {}).pop(cid, None)
        self.save()

    def get_profile_cat(self, name: str) -> str | None:
        return self.data.get("profile_cat", {}).get(name)

    def set_profile_cat(self, name: str, cid: str):
        self.data.setdefault("profile_cat", {})[name] = cid
        self.save()

    def unset_profile_cat(self, name: str):
        self.data.get("profile_cat", {}).pop(name, None)
        self.save()

    def profiles_in_cat(self, cid: str) -> list[str]:
        return [p for p, c in self.data.get("profile_cat", {}).items() if c == cid]

    def get_favorites(self) -> list[dict]:
        return self.data.get("favorites", [])

    def add_favorite(self, label: str, cmd: str):
        favs = self.data.setdefault("favorites", [])
        if not any(f["cmd"] == cmd for f in favs):
            favs.append({"label": label, "cmd": cmd})
            self.save()

    def remove_favorite(self, cmd: str):
        self.data["favorites"] = [
            f for f in self.data.get("favorites", []) if f["cmd"] != cmd
        ]
        self.save()

    def is_collapsed(self, cid: str) -> bool:
        return self.data.get("collapsed", {}).get(cid, False)

    def set_collapsed(self, cid: str, v: bool):
        self.data.setdefault("collapsed", {})[cid] = v
        self.save()

    def get_theme(self) -> str:
        return self.data.get("theme", "dark")
