"""Shared pytest fixtures for backend tests."""

import json
import os
from pathlib import Path
from unittest.mock import patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def tmp_aws_dir(tmp_path):
    """Create a temporary AWS directory with sample config/credentials/state."""
    aws_dir = tmp_path / ".aws"
    aws_dir.mkdir()

    config = aws_dir / "config"
    config.write_text(
        "[default]\n"
        "region = eu-central-1\n"
        "output = json\n"
        "\n"
        "[profile dev-sso]\n"
        "region = us-east-1\n"
        "output = json\n"
        "sso_start_url = https://my-sso.awsapps.com/start\n"
        "sso_region = us-east-1\n"
        "sso_account_id = 123456789012\n"
        "sso_role_name = DevRole\n"
        "\n"
        "[profile staging-role]\n"
        "region = eu-west-1\n"
        "output = table\n"
        "role_arn = arn:aws:iam::123456789012:role/StagingRole\n"
        "source_profile = default\n"
    )

    credentials = aws_dir / "credentials"
    credentials.write_text(
        "[default]\n"
        "aws_access_key_id = AKIAIOSFODNN7EXAMPLE\n"
        "aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\n"
    )

    state = aws_dir / "profile-manager.json"
    state.write_text(json.dumps({
        "categories": {
            "cat_001": {"name": "Development", "color": "#22c55e", "order": 0},
            "cat_002": {"name": "Production", "color": "#ef4444", "order": 1},
        },
        "profile_cat": {"dev-sso": "cat_001"},
        "favorites": [{"label": "Who am I?", "cmd": "aws sts get-caller-identity"}],
        "theme": "dark",
        "collapsed": {"cat_002": True},
    }))

    return aws_dir


@pytest.fixture
def patched_paths(tmp_aws_dir):
    """Patch AWS file paths to use temporary directory."""
    with (
        patch("backend.constants.AWS_DIR", tmp_aws_dir),
        patch("backend.constants.CONFIG_FILE", tmp_aws_dir / "config"),
        patch("backend.constants.CREDENTIALS_FILE", tmp_aws_dir / "credentials"),
        patch("backend.constants.STATE_FILE", tmp_aws_dir / "profile-manager.json"),
        patch("backend.aws_config.AWS_DIR", tmp_aws_dir),
        patch("backend.aws_config.CONFIG_FILE", tmp_aws_dir / "config"),
        patch("backend.aws_config.CREDENTIALS_FILE", tmp_aws_dir / "credentials"),
        patch("backend.state_manager.AWS_DIR", tmp_aws_dir),
        patch("backend.state_manager.STATE_FILE", tmp_aws_dir / "profile-manager.json"),
    ):
        yield tmp_aws_dir


@pytest.fixture
def api_service(patched_paths):
    """Create a fresh ApiService with patched paths."""
    from backend.api_service import ApiService
    return ApiService()


@pytest_asyncio.fixture
async def client(patched_paths):
    """Create an httpx AsyncClient for testing FastAPI routes."""
    # Need to reimport to pick up patched paths
    from importlib import reload
    import backend.api_service
    import backend.main

    reload(backend.api_service)
    reload(backend.main)

    transport = ASGITransport(app=backend.main.app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
