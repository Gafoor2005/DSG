#!/bin/bash

# Social Platform Microservices Development Setup
echo "🚀 Starting Social Platform Microservices..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed.${NC}"
    exit 1
fi

# Function to create directory structure
create_project_structure() {
    echo -e "${YELLOW}📁 Creating project structure...${NC}"
    
    # Create service directories
    mkdir -p api-gateway/{src,tests}
    mkdir -p user-service/{src,tests}
    mkdir -p content-service/{src,tests}
    mkdir -p notification-service/{src,tests}
    mkdir -p chat-service/{src,tests}
    mkdir -p analytics-service/{src,tests}
    
    # Create configuration directories
    mkdir -p nginx
    mkdir -p monitoring
    mkdir -p database/{postgres,mongo}
    
    # Create .env files for each service
    services=("api-gateway" "user-service" "content-service" "notification-service" "chat-service" "analytics-service")
    
    for service in "${services[@]}"; do
        if [ ! -f "$service/.env" ]; then
            cat > "$service/.env" << EOF
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
EOF
        fi
        
        # Create Dockerfile for each service
        if [ ! -f "$service/Dockerfile" ]; then
            cat > "$service/Dockerfile" << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
CMD ["npm", "start"]
EOF
        fi
    done
    
    echo -e "${GREEN}✅ Project structure created${NC}"
}

# Function to start infrastructure services first
start_infrastructure() {
    echo -e "${YELLOW}🏗️  Starting infrastructure services...${NC}"
    docker-compose up -d postgres mongo redis
    
    echo -e "${YELLOW}⏳ Waiting for databases to be ready...${NC}"
    sleep 10
    
    # Check database connections
    echo -e "${YELLOW}🔍 Checking database connections...${NC}"
    
    # Test PostgreSQL
    until docker-compose exec -T postgres pg_isready -U postgres; do
        echo "Waiting for PostgreSQL..."
        sleep 2
    done
    echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
    
    # Test MongoDB
    until docker-compose exec -T mongo mongosh --eval "print('MongoDB is ready')"; do
        echo "Waiting for MongoDB..."
        sleep 2
    done
    echo -e "${GREEN}✅ MongoDB is ready${NC}"
    
    # Test Redis
    until docker-compose exec -T redis redis-cli ping; do
        echo "Waiting for Redis..."
        sleep 2
    done
    echo -e "${GREEN}✅ Redis is ready${NC}"
}

# Function to start application services
start_services() {
    echo -e "${YELLOW}🚀 Starting application services...${NC}"
    # docker-compose up -d user-service content-service notification-service chat-service analytics-service
    docker-compose up -d user-service
    echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
    sleep 15
    
    # Start API Gateway last
    echo -e "${YELLOW}🌐 Starting API Gateway...${NC}"
    docker-compose up -d api-gateway
}

# Function to start monitoring stack
start_monitoring() {
    echo -e "${YELLOW}📊 Starting monitoring stack...${NC}"
    docker-compose up -d prometheus grafana elasticsearch kibana
}

# Function to show service status
show_status() {
    echo -e "${GREEN}🎉 All services started!${NC}"
    echo ""
    echo -e "${YELLOW}📋 Service Endpoints:${NC}"
    echo "🌐 API Gateway:      http://localhost:3000"
    echo "👥 User Service:     http://localhost:3001"
    echo "📝 Content Service:  http://localhost:3002"
    echo "🔔 Notification:     http://localhost:3003"
    echo "💬 Chat Service:     http://localhost:3004"
    echo "📈 Analytics:        http://localhost:3005"
    echo ""
    echo -e "${YELLOW}🗄️  Databases:${NC}"
    echo "🐘 PostgreSQL:       localhost:5432"
    echo "🍃 MongoDB:          localhost:27017"
    echo "🔴 Redis:            localhost:6379"
    echo ""
    echo -e "${YELLOW}📊 Monitoring:${NC}"
    echo "📊 Grafana:          http://localhost:3006 (admin/admin)"
    echo "🔍 Prometheus:       http://localhost:9090"
    echo "📋 Kibana:           http://localhost:5601"
    echo ""
    echo -e "${YELLOW}🔧 Management Commands:${NC}"
    echo "📊 View logs:        docker-compose logs -f [service-name]"
    echo "🔄 Restart service:  docker-compose restart [service-name]"
    echo "⬇️  Stop all:        docker-compose down"
    echo "🧹 Clean up:        docker-compose down -v --remove-orphans"
}

# Function to run health checks
health_check() {
    echo -e "${YELLOW}🏥 Running health checks...${NC}"
    
    services=("api-gateway:3000" "user-service:3001" "content-service:3002" "notification-service:3003" "chat-service:3004" "analytics-service:3005")
    
    for service in "${services[@]}"; do
        name=$(echo $service | cut -d: -f1)
        port=$(echo $service | cut -d: -f2)
        
        if curl -f -s "http://localhost:$port/health" > /dev/null; then
            echo -e "${GREEN}✅ $name${NC}"
        else
            echo -e "${RED}❌ $name${NC}"
        fi
    done
}

# Main execution
case "$1" in
    "setup")
        create_project_structure
        ;;
    "start")
        start_infrastructure
        start_services
        start_monitoring
        show_status
        ;;
    "stop")
        echo -e "${YELLOW}🛑 Stopping all services...${NC}"
        docker-compose down
        echo -e "${GREEN}✅ All services stopped${NC}"
        ;;
    "clean")
        echo -e "${YELLOW}🧹 Cleaning up containers and volumes...${NC}"
        docker-compose down -v --remove-orphans
        docker system prune -f
        echo -e "${GREEN}✅ Cleanup complete${NC}"
        ;;
    "status")
        health_check
        ;;
    "logs")
        if [ -z "$2" ]; then
            docker-compose logs -f
        else
            docker-compose logs -f "$2"
        fi
        ;;
    *)
        echo -e "${YELLOW}Social Platform Microservices Manager${NC}"
        echo ""
        echo "Usage: $0 {setup|start|stop|clean|status|logs [service-name]}"
        echo ""
        echo "Commands:"
        echo "  setup    - Create project directory structure"
        echo "  start    - Start all services"
        echo "  stop     - Stop all services"
        echo "  clean    - Stop services and remove volumes"
        echo "  status   - Check health of all services"
        echo "  logs     - View logs (optionally for specific service)"
        echo ""
        echo "Examples:"
        echo "  $0 setup           # First time setup"
        echo "  $0 start           # Start everything"
        echo "  $0 logs api-gateway # View API gateway logs"
        echo "  $0 status          # Check service health"
        ;;
esac