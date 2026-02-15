"""Tests for favorite commands management."""

import pytest


class TestAddFavorite:
    def test_add_new(self, api_service):
        result = api_service.add_favorite("List Buckets", "aws s3 ls")
        assert result.get("ok") is True
        favs = api_service.store.get_favorites()
        assert any(f["cmd"] == "aws s3 ls" for f in favs)

    def test_no_duplicates(self, api_service):
        # The fixture already has "aws sts get-caller-identity"
        api_service.add_favorite("Identity", "aws sts get-caller-identity")
        favs = api_service.store.get_favorites()
        identity_favs = [f for f in favs if f["cmd"] == "aws sts get-caller-identity"]
        assert len(identity_favs) == 1


class TestRemoveFavorite:
    def test_remove_existing(self, api_service):
        result = api_service.remove_favorite("aws sts get-caller-identity")
        assert result.get("ok") is True
        favs = api_service.store.get_favorites()
        assert not any(f["cmd"] == "aws sts get-caller-identity" for f in favs)

    def test_remove_nonexistent(self, api_service):
        result = api_service.remove_favorite("nonexistent-cmd")
        assert result.get("ok") is True
