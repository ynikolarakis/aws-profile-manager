.PHONY: dev dev-backend dev-frontend build test lint clean setup

# Development
dev: dev-backend dev-frontend

dev-backend:
	cd backend && uvicorn main:app --reload --host 127.0.0.1 --port 8099

dev-frontend:
	cd frontend && npm run dev

# Legacy (current v7)
legacy:
	python legacy/app.py

# Build
build: build-backend build-frontend

build-backend:
	cd backend && pip install -r requirements.txt

build-frontend:
	cd frontend && npm run build

# Testing
test: test-backend test-frontend

test-backend:
	pytest tests/backend/ -v

test-frontend:
	cd frontend && npm run test

test-e2e:
	cd frontend && npx playwright test

# Linting
lint: lint-backend lint-frontend

lint-backend:
	ruff check backend/ tests/

lint-frontend:
	cd frontend && npm run lint

# Setup
setup: setup-backend setup-frontend

setup-backend:
	python -m venv .venv
	.venv/Scripts/pip install -r backend/requirements.txt
	.venv/Scripts/pip install ruff pytest pytest-asyncio httpx

setup-frontend:
	cd frontend && npm install

# Clean
clean:
	rm -rf __pycache__ .pytest_cache .ruff_cache htmlcov .coverage
	rm -rf frontend/node_modules frontend/dist
	rm -rf .venv
