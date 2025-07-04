# Makefile for the Load Balancer Project

# --- Variables ---
# Use docker-compose for orchestration
COMPOSE = docker-compose
# Docker network name, as specified in the assignment
NETWORK_NAME = net1
# Name for the server image, to be used by the load balancer
SERVER_IMAGE_NAME = davemanufor/ds-project-server
# Name for the load balancer image
LOAD_BALANCER_IMAGE_NAME = load-balancer-img

.PHONY: all build up down logs clean test-deps test-a1 test-a2 test-a3 test-a4

# --- Main Targets ---

# Default target: build images and start the services
all: build up

# Build Docker images for both server and load balancer
build:
	@echo "Building server Docker image..."
	docker build -t $(SERVER_IMAGE_NAME) ./server
	@echo "Building load-balancer Docker image..."
	docker build -t $(LOAD_BALANCER_IMAGE_NAME) ./load-balancer

# Start the services in detached mode
up: setup-network
	@echo "Starting services with docker-compose..."
	$(COMPOSE) up -d

# Stop and remove the services
down:
	@echo "Stopping services and removing containers..."
	$(COMPOSE) down

# Follow the logs from all services
logs:
	@echo "Following logs..."
	$(COMPOSE) logs -f

# Clean up the environment completely
clean: down
	@echo "Removing Docker network $(NETWORK_NAME)..."
	@docker network rm $(NETWORK_NAME) || true
	@echo "Removing Docker images..."
	@docker rmi $(SERVER_IMAGE_NAME) || true
	@docker rmi $(LOAD_BALANCER_IMAGE_NAME) || true
	@echo "Cleanup complete."


# --- Testing Targets ---

# Install dependencies for the test suite
test-deps:
	@echo "Installing test dependencies..."
	@cd tests && npm install

# Run Analysis Task A1
test-a1: test-deps
	@echo "Running test A1: Load distribution for N=3..."
	@node tests/main.js A1

# Run Analysis Task A2
test-a2: test-deps
	@echo "Running test A2: Scalability analysis from N=2 to N=6..."
	@node tests/main.js A2

# Guide for Analysis Task A3
test-a3:
	@echo "--- Testing Endpoints and Fault Tolerance (A3) ---"
	@echo "This is a manual test. Please follow the steps in tests/A3.md."
	@echo "You can view the file with 'cat tests/A3.md'"

# Run Analysis Task A4
test-a4: test-deps
	@echo "Running test A4: Analysis with modified hash functions..."
	@node tests/main.js A4


# --- Helper Targets ---

# Create the external Docker network if it doesn't exist
setup-network:
	@docker network inspect $(NETWORK_NAME) >/dev/null 2>&1 || \
		(echo "Creating Docker network: $(NETWORK_NAME)" && docker network create $(NETWORK_NAME))