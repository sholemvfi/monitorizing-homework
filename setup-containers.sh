#!/bin/bash

# Setup Script for Monitoring System Containers
# This script helps set up the monitoring system with Docker containers

echo "🚀 Setting up Monitoring System Containers..."
echo "=============================================="

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker and try again."
        exit 1
    fi
    echo "✅ Docker is running"
}

# Function to create Docker network
create_network() {
    if ! docker network ls | grep -q monitoring-network; then
        echo "Creating Docker network: monitoring-network"
        docker network create monitoring-network
    else
        echo "✅ Docker network 'monitoring-network' already exists"
    fi
}

# Function to build and run containers
setup_containers() {
    echo ""
    echo "📦 Setting up containers..."
    
    # Create Dockerfile for agents
    cat > Dockerfile.agent << 'EOF'
FROM node:18-alpine

# Install required packages
RUN apk add --no-cache stress-ng openssl

# Create app directory
WORKDIR /app

# Copy package files
COPY agent/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY agent/ ./

# Expose port
EXPOSE 5001

# Start the agent
CMD ["npm", "start"]
EOF

    # Create Dockerfile for servers
    cat > Dockerfile.server << 'EOF'
FROM node:18-alpine

# Install required packages
RUN apk add --no-cache stress-ng

# Create app directory
WORKDIR /app

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY server/ ./

# Expose port
EXPOSE 4001

# Start the server
CMD ["npm", "start"]
EOF

    echo "Building agent containers..."
    for i in {1..3}; do
        docker build -f Dockerfile.agent -t monitoring-agent-$i .
        docker run -d --name agent-$i --network monitoring-network -p 500$i:5001 -e AGENT_PORT=5001 monitoring-agent-$i
    done

    echo "Building server containers..."
    for i in {1..3}; do
        docker build -f Dockerfile.server -t monitoring-server-$i .
        docker run -d --name server-$i --network monitoring-network -p 400$i:4001 -e SERVER_PORT=4001 monitoring-server-$i
    done

    echo "✅ All containers are running"
}

# Function to show container status
show_status() {
    echo ""
    echo "📊 Container Status:"
    echo "==================="
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Function to show usage instructions
show_instructions() {
    echo ""
    echo "🎯 Next Steps:"
    echo "=============="
    echo "1. Start the monitor: cd monitor && npm install && node index.js"
    echo "2. Open dashboard: http://localhost:3000"
    echo "3. Run chaos experiments: ./chaos-experiments.sh"
    echo ""
    echo "📁 Container Details:"
    echo "- Agents: localhost:5001-5003"
    echo "- Servers: localhost:4001-4003"
    echo "- Monitor: localhost:3000"
    echo ""
    echo "🔧 Useful Commands:"
    echo "- View logs: docker logs <container-name>"
    echo "- Stop containers: docker stop agent-1 agent-2 agent-3 server-1 server-2 server-3"
    echo "- Remove containers: docker rm agent-1 agent-2 agent-3 server-1 server-2 server-3"
}

# Main execution
check_docker
create_network
setup_containers
show_status
show_instructions

echo "🎉 Setup completed successfully!" 