.PHONY: all init setup setup-dev build build-dev build-frontend build-backend logs logs-frontend logs-backend shell shell-frontend shell-backend run run-dev stop clean help

all: help

uid := $(shell id -u)
gid := $(shell id -g)

# Project configuration
PROJECT_NAME := famtown
DOCKER_NETWORK_NAME ?= breathnet

# Setup targets
init:
	@echo "Initializing FamTown project..."
	@echo "Ensuring Docker network exists: $(DOCKER_NETWORK_NAME)"
	@docker network inspect $(DOCKER_NETWORK_NAME) >/dev/null 2>&1 || docker network create $(DOCKER_NETWORK_NAME)
	@echo "Project initialized. Set environment variables as needed."

setup: init build
	@echo "FamTown setup complete!"

setup-dev: init build-dev
	@echo "FamTown development setup complete!"

# Build targets
build-dev:
	@echo "Building development images..."
	uid=$(uid) gid=$(gid) docker compose -p $(PROJECT_NAME) --profile dev build

build:
	@echo "Building production images..."
	uid=$(uid) gid=$(gid) docker compose -p $(PROJECT_NAME) --profile prod build

build-frontend:
	@echo "Building frontend image..."
	docker compose -p $(PROJECT_NAME) build frontend

build-backend:
	@echo "Building backend image..."
	uid=$(uid) gid=$(gid) docker compose -p $(PROJECT_NAME) build backend

# Logging targets
logs:
	logs-frontend
	logs-backend

logs-frontend:
	@docker logs famtown-frontend

logs-backend:
	@docker logs famtown-backend

logs-postgres:
	@docker logs postgres

logs-build:
	@docker logs --tail=100 famtown-frontend && docker logs --tail=100 famtown-backend

# Shell access targets
shell:
	@echo "Available containers:"
	@echo "  backend  - Backend container shell"
	@echo "  frontend - Frontend container shell"
	@echo "  postgres - Database container shell"
	@echo "Usage: make shell-<container>"

shell-backend:
	docker exec -it famtown-backend /bin/bash

shell-frontend:
	docker exec -it famtown-frontend /bin/sh

# Run targets
run-dev:
	@echo "Starting FamTown in development mode..."
	$(MAKE) stop
	@if [ -z "$$(docker images -q famtown-backend-dev)" ]; then \
        echo "Development images not found. Building..."; \
        $(MAKE) build-dev; \
    fi
	docker compose -p $(PROJECT_NAME) --profile dev up

run:
	@echo "Starting FamTown in production mode..."
	$(MAKE) stop
	@if [ -z "$$(docker images -q famtown-backend)" ]; then \
        echo "Production images not found. Building..."; \
        $(MAKE) build; \
    fi
	docker compose -p $(PROJECT_NAME) --profile prod up -d

run-detached:
	@echo "Starting FamTown in production mode (detached)..."
	$(MAKE) stop
	docker compose -p $(PROJECT_NAME) --profile prod up -d

run-frontend:
	@echo "Starting frontend only..."
	docker compose -p $(PROJECT_NAME) up frontend

run-backend:
	@echo "Starting backend only..."
	docker compose -p $(PROJECT_NAME) up backend postgres

# Stop and cleanup targets
stop:
	@echo "Stopping FamTown services..."
	docker compose -p $(PROJECT_NAME) --profile dev down 2>/dev/null || true
	docker compose -p $(PROJECT_NAME) --profile prod down 2>/dev/null || true
	@echo "All services stopped"

clean:
	@echo "Cleaning up FamTown containers and images..."
	$(MAKE) stop
	docker compose -p $(PROJECT_NAME) down --volumes --remove-orphans
	docker system prune -f
	@echo "Cleanup complete"

# Database targets
db-migrate:
	@echo "Running database migrations..."
	docker exec -it famtown-backend python -m alembic upgrade head 2>/dev/null || echo "Migration completed or not needed"

db-reset:
	@echo "Resetting database (WARNING: This will delete all data!)..."
	@read -p "Are you sure? Type 'yes' to continue: " confirm && [ "$$confirm" = "yes" ] && \
	docker compose -p $(PROJECT_NAME) down postgres && \
	docker volume rm $(PROJECT_NAME)_postgres-data 2>/dev/null || true && \
	docker compose -p $(PROJECT_NAME) up -d postgres

update:
	@echo "Updating FamTown..."
	git pull
	$(MAKE) build
	@echo "FamTown updated"

# Help target
help:
	@echo '================================'
	@echo '     FAMTOWN - MAKEFILE HELP    '
	@echo '================================'
	@echo ''
	@echo 'Setup Commands:'
	@echo '  init                 - Initialize project and create Docker network'
	@echo '  setup                - Full production setup (init + build)'
	@echo '  setup-dev            - Full development setup (init + build-dev)'
	@echo ''
	@echo 'Build Commands:'
	@echo '  build                - Build production images'
	@echo '  build-dev            - Build development images'
	@echo '  build-frontend       - Build frontend image only'
	@echo '  build-backend        - Build backend image only'
	@echo ''
	@echo 'Run Commands:'
	@echo '  run                  - Run in production mode'
	@echo '  run-dev              - Run in development mode with hot-reload'
	@echo '  run-detached         - Run in production mode (background)'
	@echo '  run-frontend         - Run frontend only'
	@echo '  run-backend          - Run backend + database only'
	@echo ''
	@echo 'Logging Commands:'
	@echo '  logs                 - Show all service logs'
	@echo '  logs-frontend        - Show frontend logs'
	@echo '  logs-backend         - Show backend logs'
	@echo '  logs-postgres        - Show postgres logs'
	@echo '  logs-build           - Show build logs (last 100 lines)'
	@echo ''
	@echo 'Shell Access:'
	@echo '  shell-backend        - Access backend container shell'
	@echo '  shell-frontend       - Access frontend container shell'
	@echo '  shell-postgres       - Access database shell'
	@echo ''
	@echo 'Database Commands:'
	@echo '  db-migrate           - Run database migrations'
	@echo '  db-reset             - Reset database (WARNING: deletes data)'
	@echo ''
	@echo 'Maintenance Commands:'
	@echo '  stop                 - Stop all services'
	@echo '  clean                - Stop services and clean up containers'
	@echo '  update               - Pull latest code and redeploy'
	@echo ''
	@echo 'Quick Start:'
	@echo '  make setup-dev && make run-dev    # Development'
	@echo '  make setup && make run             # Production'
	@echo '================================'