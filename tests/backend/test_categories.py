"""Tests for category CRUD and profile-category assignment."""

import pytest


class TestAddCategory:
    def test_add_returns_id(self, api_service):
        result = api_service.add_category("Staging", "#f59e0b")
        assert result.get("ok") is True
        assert result.get("id", "").startswith("cat_")

    def test_add_persists(self, api_service):
        result = api_service.add_category("Staging", "#f59e0b")
        cats = api_service.store.get_categories()
        assert result["id"] in cats
        assert cats[result["id"]]["name"] == "Staging"


class TestEditCategory:
    def test_edit_existing(self, api_service):
        result = api_service.edit_category("cat_001", "Dev Updated", "#3b82f6")
        assert result.get("ok") is True
        cats = api_service.store.get_categories()
        assert cats["cat_001"]["name"] == "Dev Updated"
        assert cats["cat_001"]["color"] == "#3b82f6"


class TestDeleteCategory:
    def test_delete_removes_category(self, api_service):
        api_service.delete_category("cat_001")
        assert "cat_001" not in api_service.store.get_categories()

    def test_delete_removes_profile_assignments(self, api_service):
        api_service.delete_category("cat_001")
        assert api_service.store.get_profile_cat("dev-sso") is None


class TestToggleCollapsed:
    def test_toggle_from_false(self, api_service):
        result = api_service.toggle_collapsed("cat_001")
        assert result.get("collapsed") is True

    def test_toggle_from_true(self, api_service):
        result = api_service.toggle_collapsed("cat_002")
        assert result.get("collapsed") is False


class TestSetProfileCategory:
    def test_assign_profile(self, api_service):
        result = api_service.set_profile_category("default", "cat_002")
        assert result.get("ok") is True
        assert api_service.store.get_profile_cat("default") == "cat_002"

    def test_unassign_profile(self, api_service):
        result = api_service.set_profile_category("dev-sso", "__none__")
        assert result.get("ok") is True
        assert api_service.store.get_profile_cat("dev-sso") is None
