.PHONY: dev dev-backend dev-frontend build test lint clean setup start

# Development (run both servers concurrently)
dev:
	@echo "Starting backend on :8099 and frontend on :5173..."
	@$(MAKE) dev-backend &
	@$(MAKE) dev-frontend

dev-backend:
	python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8099

dev-frontend:
	cd frontend && npm run dev

# Legacy (current v7)
legacy:
	python legacy/app.py

# Production (single server serving built frontend + API)
start:
	python -m uvicorn backend.main:app --host 127.0.0.1 --port 8099

# Build
build: build-backend build-frontend

build-backend:
	python -m pip install -r backend/requirements.txt

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
	ruff check backend/

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
	rm -rf frontend/node_modules frontend/dist backend/static
	rm -rf .venv
