#!/bin/bash

# Function to display usage
usage() {
    echo "Usage: ./docker.sh [dev|prod] [up|down|build]"
    echo
    echo "Commands:"
    echo "  dev   - Run in development mode"
    echo "  prod  - Run in production mode"
    echo
    echo "Actions:"
    echo "  down  - Stop and remove containers"
    echo "  build - Rebuild containers"
    exit 1
}

# Check if environment argument is provided
if [ -z "$1" ] || [ -z "$2" ]; then
    usage
fi

# Set environment
ENV=$1
ACTION=$2

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found"
    echo "Please copy .env.example to .env and configure it"
    exit 1
fi

# Execute docker-compose command based on environment and action
case $ENV in
    dev)
        case $ACTION in
            down)
                docker-compose -f docker-compose.dev.yml down -v
                ;;
            build)
                docker-compose -f docker-compose.dev.yml up --build -d
                ;;
            *)
                usage
                ;;
        esac
        ;;
    prod)
        case $ACTION in
            down)
                docker-compose -f docker-compose.prod.yml down -v
                ;;
            build)
                docker-compose -f docker-compose.prod.yml up --build -d
                ;;
            *)
                usage
                ;;
        esac
        ;;
    *)
        usage
        ;;
esac