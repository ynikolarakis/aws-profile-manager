"""Tests for /api/state — full state response, secret masking, profile types."""

import pytest


class TestGetState:
    def test_returns_all_fields(self, api_service):
        state = api_service.get_state()
        assert "profiles" in state
        assert "categories" in state
        assert "profile_cat" in state
        assert "favorites" in state
        assert "theme" in state
        assert "active" in state
        assert "collapsed" in state
        assert "regions" in state
        assert "services_map" in state

    def test_masks_secret_access_key(self, api_service):
        state = api_service.get_state()
        default_prof = state["profiles"]["default"]
        assert default_prof.get("aws_secret_access_key") == "••••••••"
        assert default_prof.get("has_keys") is True

    def test_preserves_access_key_id(self, api_service):
        state = api_service.get_state()
        default_prof = state["profiles"]["default"]
        assert default_prof["aws_access_key_id"] == "AKIAIOSFODNN7EXAMPLE"

    def test_correct_profile_types(self, api_service):
        state = api_service.get_state()
        profiles = state["profiles"]
        assert profiles["default"]["type"] == "credentials"
        assert profiles["dev-sso"]["type"] == "sso"
        assert profiles["staging-role"]["type"] == "role"

    def test_sso_profile_has_sso_fields(self, api_service):
        state = api_service.get_state()
        sso = state["profiles"]["dev-sso"]
        assert sso["sso_start_url"] == "https://my-sso.awsapps.com/start"
        assert sso["sso_account_id"] == "123456789012"
        assert sso["sso_role_name"] == "DevRole"

    def test_role_profile_has_role_fields(self, api_service):
        state = api_service.get_state()
        role = state["profiles"]["staging-role"]
        assert role["role_arn"] == "arn:aws:iam::123456789012:role/StagingRole"
        assert role["source_profile"] == "default"

    def test_theme_default(self, api_service):
        state = api_service.get_state()
        assert state["theme"] == "dark"

    def test_categories_loaded(self, api_service):
        state = api_service.get_state()
        assert "cat_001" in state["categories"]
        assert state["categories"]["cat_001"]["name"] == "Development"

    def test_favorites_loaded(self, api_service):
        state = api_service.get_state()
        assert len(state["favorites"]) == 1
        assert state["favorites"][0]["label"] == "Who am I?"

    def test_regions_list(self, api_service):
        state = api_service.get_state()
        assert "us-east-1" in state["regions"]
        assert "eu-central-1" in state["regions"]

    def test_services_map_present(self, api_service):
        state = api_service.get_state()
        assert "Amazon Elastic Compute Cloud" in state["services_map"]
        ec2 = state["services_map"]["Amazon Elastic Compute Cloud"]
        assert ec2["short"] == "EC2"
        assert "cmds" in ec2


@pytest.mark.asyncio
class TestGetStateEndpoint:
    async def test_api_state_returns_200(self, client):
        resp = await client.get("/api/state")
        assert resp.status_code == 200
        data = resp.json()
        assert "profiles" in data
