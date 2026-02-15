"""Tests for config save/load, backups, import/export."""

import configparser
import json

import pytest


class TestConfigSave:
    def test_save_writes_ini(self, api_service, patched_paths):
        api_service.mgr.save()

        cfg = configparser.ConfigParser()
        cfg.read(str(patched_paths / "config"))
        assert "default" in cfg.sections()
        assert cfg.get("default", "region") == "eu-central-1"

    def test_save_creates_backups(self, api_service, patched_paths):
        api_service.mgr.save()
        backups = list(patched_paths.glob("config.bak.*"))
        assert len(backups) >= 1

    def test_credentials_file_written(self, api_service, patched_paths):
        api_service.mgr.save()
        crd = configparser.ConfigParser()
        crd.read(str(patched_paths / "credentials"))
        assert "default" in crd.sections()
        assert crd.get("default", "aws_access_key_id") == "AKIAIOSFODNN7EXAMPLE"

    def test_sso_profile_in_config(self, api_service, patched_paths):
        api_service.mgr.save()
        cfg = configparser.ConfigParser()
        cfg.read(str(patched_paths / "config"))
        assert cfg.get("profile dev-sso", "sso_start_url") == "https://my-sso.awsapps.com/start"


class TestReloadConfig:
    def test_reload_reloads(self, api_service):
        state = api_service.reload_config()
        assert "profiles" in state
        assert "default" in state["profiles"]


class TestExportImport:
    def test_export_contains_profiles(self, api_service):
        data = api_service.export_json()
        assert "profiles" in data
        assert "default" in data["profiles"]
        assert "categories" in data

    def test_import_adds_profiles(self, api_service):
        result = api_service.import_json({
            "profiles": {
                "imported-prof": {
                    "type": "credentials",
                    "region": "us-west-2",
                    "output": "json",
                }
            },
            "categories": {},
            "profile_cat": {},
        })
        assert result.get("ok") is True
        assert result.get("count") == 1
        assert "imported-prof" in api_service.mgr.profiles
