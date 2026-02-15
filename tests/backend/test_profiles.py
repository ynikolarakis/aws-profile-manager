"""Tests for profile validation, save, rename, delete, and activate."""

import pytest


class TestValidateName:
    def test_empty_name(self, api_service):
        assert api_service.validate_name("") == "Name is required"

    def test_spaces_in_name(self, api_service):
        result = api_service.validate_name("my profile")
        assert result is not None
        assert "spaces" in result.lower() or "No spaces" in result

    def test_special_chars(self, api_service):
        assert api_service.validate_name("my@profile") is not None

    def test_valid_name_simple(self, api_service):
        assert api_service.validate_name("my-profile") is None

    def test_valid_name_with_dots(self, api_service):
        assert api_service.validate_name("my.profile.v2") is None

    def test_valid_name_with_underscores(self, api_service):
        assert api_service.validate_name("my_profile") is None

    def test_starts_with_number(self, api_service):
        assert api_service.validate_name("123profile") is None

    def test_starts_with_hyphen(self, api_service):
        result = api_service.validate_name("-profile")
        assert result is not None


class TestSaveProfile:
    def test_save_new_credentials_profile(self, api_service):
        result = api_service.save_profile({
            "name": "new-test",
            "type": "credentials",
            "region": "us-west-2",
            "output": "json",
            "aws_access_key_id": "AKIATEST",
            "aws_secret_access_key": "TestSecret123",
        })
        assert result.get("ok") is True
        assert "new-test" in api_service.mgr.profiles

    def test_save_invalid_name(self, api_service):
        result = api_service.save_profile({"name": "", "type": "credentials"})
        assert "error" in result

    def test_rename_profile(self, api_service):
        result = api_service.save_profile({
            "_orig_name": "default",
            "name": "renamed-default",
            "type": "credentials",
            "region": "eu-central-1",
            "output": "json",
        })
        assert result.get("ok") is True
        assert "renamed-default" in api_service.mgr.profiles
        assert "default" not in api_service.mgr.profiles

    def test_save_preserves_secret_key(self, api_service):
        """When editing, if no new secret key is provided, keep the old one."""
        result = api_service.save_profile({
            "name": "default",
            "type": "credentials",
            "region": "eu-central-1",
            "output": "json",
            "aws_access_key_id": "AKIAIOSFODNN7EXAMPLE",
        })
        assert result.get("ok") is True
        assert api_service.mgr.profiles["default"]["aws_secret_access_key"] == "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

    def test_save_sso_profile(self, api_service):
        result = api_service.save_profile({
            "name": "new-sso",
            "type": "sso",
            "region": "us-east-1",
            "output": "json",
            "sso_start_url": "https://test.awsapps.com/start",
            "sso_region": "us-east-1",
            "sso_account_id": "999999999999",
            "sso_role_name": "Admin",
        })
        assert result.get("ok") is True
        assert api_service.mgr.profiles["new-sso"]["type"] == "sso"


class TestDeleteProfile:
    def test_delete_existing(self, api_service):
        result = api_service.delete_profile("dev-sso")
        assert result.get("ok") is True
        assert "dev-sso" not in api_service.mgr.profiles

    def test_delete_nonexistent(self, api_service):
        result = api_service.delete_profile("nonexistent")
        assert result.get("ok") is True


class TestActivateProfile:
    def test_activate(self, api_service):
        result = api_service.activate("dev-sso")
        assert result.get("ok") is True
        assert api_service._active == "dev-sso"

    def test_activate_sets_env(self, api_service):
        import os
        api_service.activate("dev-sso")
        assert os.environ.get("AWS_PROFILE") == "dev-sso"
