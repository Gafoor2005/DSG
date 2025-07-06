# blueprint

# 1️⃣ overview

---

Absolutely! Let me help you understand how to deploy and connect microservices for your social platform. This is a complex but rewarding architecture choice.

## Core Microservices Architecture Components

**Service Discovery**: Use tools like Consul, Eureka, or cloud-native solutions (AWS Service Discovery, Kubernetes DNS) so services can find and communicate with each other dynamically.

**API Gateway**: Deploy a single entry point (like Kong, Zuul, or AWS API Gateway) that handles routing, authentication, rate limiting, and load balancing across your microservices.

**Message Queues/Event Streaming**: Use RabbitMQ, Apache Kafka, or cloud services (AWS SQS/SNS) for asynchronous communication between services. Critical for social platforms where actions like "user posts content" trigger multiple downstream services.

## Deployment Strategies

**Containerization**: Package each microservice in Docker containers. This ensures consistency across environments and makes scaling individual services easier.

**Orchestration**: Use Kubernetes or Docker Swarm to manage your containers. Kubernetes is more complex but provides better scalability and self-healing capabilities.

**Cloud-Native Options**: Consider managed services like AWS ECS/Fargate, Google Cloud Run, or Azure Container Instances for simpler deployment without managing infrastructure.

## Service Communication Patterns

**Synchronous**: REST APIs or gRPC for real-time operations (user authentication, fetching user profiles).

**Asynchronous**: Event-driven architecture for operations that don't need immediate responses (sending notifications, updating analytics, content moderation).

**Database Per Service**: Each microservice should own its data. Use database replication or event sourcing to share data between services when needed.

## Monitoring and Observability

Implement distributed tracing (Jaeger, Zipkin), centralized logging (ELK stack), and metrics collection (Prometheus + Grafana) from day one. Social platforms generate lots of interconnected requests that are hard to debug without proper observability.

What specific services are you planning for your social platform? (user management, content service, notifications, etc.) This would help me give more targeted deployment advice.

# 2️⃣ setup & workflow

---

Perfect! Running microservices locally is a great way to develop and test your architecture. Here's how to set up a local microservices environment for your social platform:

## Local Development Setup

**Docker Compose**: This is your best friend for local microservices. Create a `docker-compose.yml` file that defines all your services, databases, and networking. Each service gets its own container but they can all communicate through Docker's internal networking.

**Port Management**: Assign different ports to each service (e.g., User Service on 3001, Content Service on 3002, Notification Service on 3003). Your API Gateway can run on port 3000 and route requests to the appropriate services.

**Local Service Discovery**: Use Docker Compose service names as hostnames. Services can communicate using `http://user-service:3001` instead of `http://localhost:3001`.

## Sample Local Architecture

```
API Gateway (localhost:3000)
├── User Service (localhost:3001)
├── Content Service (localhost:3002)
├── Notification Service (localhost:3003)
└── Analytics Service (localhost:3004)

Databases:
├── PostgreSQL (localhost:5432) - User data
├── MongoDB (localhost:27017) - Content/posts
└── Redis (localhost:6379) - Sessions/cache

```

## Development Workflow

**Hot Reloading**: Use tools like nodemon for Node.js or similar for your tech stack so services restart automatically when you make changes.

**Local Message Queue**: Run Redis or RabbitMQ in a container for inter-service communication. Much lighter than Kafka for local development.

**Shared Volumes**: Mount your source code as volumes in Docker containers so you can edit locally and see changes immediately.

## Networking and Communication

All services can communicate through Docker's internal network. Use environment variables for service URLs so you can easily switch between local and production configurations.

What tech stack are you using for your services? (Node.js, Python, Java, etc.) I can help you create a specific Docker Compose setup for your social platform.

# 3️⃣ tech stack (prefered)

---

For a social platform with microservices, here's the stack I'd recommend:

## Backend Services

**Node.js with Express/Fastify**: Excellent for I/O-heavy social platform operations (real-time messaging, feed generation, notifications). Fast development cycle, great ecosystem, and handles concurrent users well. TypeScript adds type safety for larger codebases.

**Alternative**: Go for services that need high performance (content delivery, real-time features) or Python with FastAPI for services requiring ML integration (content recommendation, moderation).

## Databases

**PostgreSQL**: Primary database for user profiles, relationships, structured social data. Excellent ACID compliance and JSON support for flexible schemas.

**Redis**: Session storage, caching, real-time features (online users, chat), and as a message broker for smaller setups.

**MongoDB**: Optional for content-heavy services (posts, media metadata, comments) where document structure varies.

## Infrastructure & Communication

**Docker + Docker Compose**: For local development and easy service management.

**NGINX**: As API Gateway and load balancer. Lightweight, battle-tested, and great for serving static content.

**Socket.io**: For real-time features (chat, live notifications, activity feeds).

## Monitoring & Development

**Winston + ELK Stack**: Centralized logging across all services.

**Prometheus + Grafana**: Metrics and monitoring dashboards.

**Jest**: Testing framework that works well across all services.

## Sample Service Breakdown

- **User Service**: Authentication, profiles, relationships
- **Content Service**: Posts, media, comments
- **Feed Service**: Timeline generation, content aggregation
- **Notification Service**: Push notifications, email, in-app alerts
- **Chat Service**: Real-time messaging
- **Analytics Service**: User behavior, engagement metrics

This stack is pragmatic - proven technologies that work well together, have good documentation, and won't overcomplicate your local development. Want me to create a sample Docker Compose setup for this stack?

# 4️⃣ initial workflow

---

Perfect! Let me create a complete Docker Compose setup for your social platform microservices.

```yaml
version: '3.8'

services:
  # API Gateway
  api-gateway:
    build: ./api-gateway
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - USER_SERVICE_URL=http://user-service:3001
      - CONTENT_SERVICE_URL=http://content-service:3002
      - NOTIFICATION_SERVICE_URL=http://notification-service:3003
      - CHAT_SERVICE_URL=http://chat-service:3004
      - ANALYTICS_SERVICE_URL=http://analytics-service:3005
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - user-service
      - content-service
      - notification-service
      - chat-service
      - analytics-service
    volumes:
      - ./api-gateway:/app
      - /app/node_modules
    networks:
      - social-network

  # User Service
  user-service:
    build: ./user-service
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=users_db
      - DB_USER=postgres
      - DB_PASSWORD=password
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=your-jwt-secret-key
    depends_on:
      - postgres
      - redis
    volumes:
      - ./user-service:/app
      - /app/node_modules
    networks:
      - social-network

  # Content Service
  content-service:
    build: ./content-service
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=development
      - MONGO_URL=mongodb://mongo:27017/content_db
      - REDIS_URL=redis://redis:6379
      - USER_SERVICE_URL=http://user-service:3001
    depends_on:
      - mongo
      - redis
    volumes:
      - ./content-service:/app
      - /app/node_modules
    networks:
      - social-network

  # Notification Service
  notification-service:
    build: ./notification-service
    ports:
      - "3003:3003"
    environment:
      - NODE_ENV=development
      - REDIS_URL=redis://redis:6379
      - USER_SERVICE_URL=http://user-service:3001
      - EMAIL_SERVICE_KEY=your-email-service-key
    depends_on:
      - redis
    volumes:
      - ./notification-service:/app
      - /app/node_modules
    networks:
      - social-network

  # Chat Service
  chat-service:
    build: ./chat-service
    ports:
      - "3004:3004"
    environment:
      - NODE_ENV=development
      - MONGO_URL=mongodb://mongo:27017/chat_db
      - REDIS_URL=redis://redis:6379
      - USER_SERVICE_URL=http://user-service:3001
    depends_on:
      - mongo
      - redis
    volumes:
      - ./chat-service:/app
      - /app/node_modules
    networks:
      - social-network

  # Analytics Service
  analytics-service:
    build: ./analytics-service
    ports:
      - "3005:3005"
    environment:
      - NODE_ENV=development
      - MONGO_URL=mongodb://mongo:27017/analytics_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis
    volumes:
      - ./analytics-service:/app
      - /app/node_modules
    networks:
      - social-network

  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=users_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - social-network

  # MongoDB Database
  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
    volumes:
      - mongo_data:/data/db
    networks:
      - social-network

  # Redis Cache & Message Broker
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - social-network

  # NGINX API Gateway Alternative (Optional)
  nginx:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api-gateway
    networks:
      - social-network

  # Monitoring Stack
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - social-network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - social-network

  # Elasticsearch for Logging
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    ports:
      - "9200:9200"
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - social-network

  # Kibana for Log Visualization
  kibana:
    image: docker.elastic.co/kibana/kibana:8.8.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch
    networks:
      - social-network

volumes:
  postgres_data:
  mongo_data:
  redis_data:
  prometheus_data:
  grafana_data:
  elasticsearch_data:

networks:
  social-network:
    driver: bridge
```

Now let me create a sample Dockerfile template for your Node.js services:

```docker
# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]
```

Let me also create a sample API Gateway service to show how services connect:

```jsx
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const redis = require('redis');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Redis client for caching and session management
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect().catch(console.error);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use(limiter);

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Check if token is blacklisted in Redis
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      redis: redisClient.isReady ? 'connected' : 'disconnected'
    }
  });
});

// Service proxy configurations
const services = {
  user: {
    target: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: {
      '^/api/users': ''
    },
    onError: (err, req, res) => {
      console.error('User service error:', err.message);
      res.status(503).json({ error: 'User service unavailable' });
    }
  },
  content: {
    target: process.env.CONTENT_SERVICE_URL || 'http://localhost:3002',
    changeOrigin: true,
    pathRewrite: {
      '^/api/content': ''
    },
    onError: (err, req, res) => {
      console.error('Content service error:', err.message);
      res.status(503).json({ error: 'Content service unavailable' });
    }
  },
  notifications: {
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003',
    changeOrigin: true,
    pathRewrite: {
      '^/api/notifications': ''
    },
    onError: (err, req, res) => {
      console.error('Notification service error:', err.message);
      res.status(503).json({ error: 'Notification service unavailable' });
    }
  },
  chat: {
    target: process.env.CHAT_SERVICE_URL || 'http://localhost:3004',
    changeOrigin: true,
    pathRewrite: {
      '^/api/chat': ''
    },
    onError: (err, req, res) => {
      console.error('Chat service error:', err.message);
      res.status(503).json({ error: 'Chat service unavailable' });
    }
  },
  analytics: {
    target: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3005',
    changeOrigin: true,
    pathRewrite: {
      '^/api/analytics': ''
    },
    onError: (err, req, res) => {
      console.error('Analytics service error:', err.message);
      res.status(503).json({ error: 'Analytics service unavailable' });
    }
  }
};

// Public routes (no authentication required)
app.use('/api/users/register', createProxyMiddleware(services.user));
app.use('/api/users/login', createProxyMiddleware(services.user));
app.use('/api/users/verify', createProxyMiddleware(services.user));

// Protected routes (authentication required)
app.use('/api/users', authenticateToken, createProxyMiddleware(services.user));
app.use('/api/content', authenticateToken, createProxyMiddleware(services.content));
app.use('/api/notifications', authenticateToken, createProxyMiddleware(services.notifications));
app.use('/api/chat', authenticateToken, createProxyMiddleware(services.chat));
app.use('/api/analytics', authenticateToken, createProxyMiddleware(services.analytics));

// WebSocket proxy for real-time features
const { createProxyMiddleware: createWSProxy } = require('http-proxy-middleware');

// Chat WebSocket proxy
app.use('/ws/chat', createWSProxy({
  target: process.env.CHAT_SERVICE_URL || 'http://localhost:3004',
  ws: true,
  changeOrigin: true,
  onError: (err, req, res) => {
    console.error('Chat WebSocket error:', err.message);
  }
}));

// Logging middleware for analytics
app.use((req, res, next) => {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id || 'anonymous'
  };

  // Send to analytics service asynchronously
  if (process.env.NODE_ENV === 'production') {
    redisClient.lPush('api_logs', JSON.stringify(logData));
  }

  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    requestId: req.headers['x-request-id'] || 'unknown'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await redisClient.quit();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`🔗 Service endpoints:`);
  console.log(`   Users: /api/users`);
  console.log(`   Content: /api/content`);
  console.log(`   Notifications: /api/notifications`);
  console.log(`   Chat: /api/chat`);
  console.log(`   Analytics: /api/analytics`);
});

module.exports = app;
```

Now let me create a sample package.json and startup script:

```json
{
  "name": "social-platform-microservice",
  "version": "1.0.0",
  "description": "Social platform microservice",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.8.1",
    "http-proxy-middleware": "^2.0.6",
    "jsonwebtoken": "^9.0.1",
    "bcryptjs": "^2.4.3",
    "redis": "^4.6.7",
    "pg": "^8.11.1",
    "mongoose": "^7.4.0",
    "socket.io": "^4.7.2",
    "winston": "^3.10.0",
    "joi": "^17.9.2",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.6.1",
    "supertest": "^6.3.3",
    "eslint": "^8.45.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

Finally, let me create a simple startup script to make development easier:

```bash
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
    docker-compose up -d user-service content-service notification-service chat-service analytics-service
    
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
```

Perfect! I've created a complete microservices stack for your social platform. Here's what you have:

## 🏗️ Complete Stack Overview

**Core Services:**

- **API Gateway** (Port 3000) - Routes requests, handles auth, rate limiting
- **User Service** (Port 3001) - Authentication, profiles, relationships
- **Content Service** (Port 3002) - Posts, media, comments
- **Notification Service** (Port 3003) - Push notifications, emails
- **Chat Service** (Port 3004) - Real-time messaging
- **Analytics Service** (Port 3005) - User behavior tracking

**Infrastructure:**

- **PostgreSQL** - User data and relationships
- **MongoDB** - Content and chat messages
- **Redis** - Caching, sessions, message queuing
- **NGINX** - Load balancing alternative
- **Prometheus + Grafana** - Monitoring and metrics
- **Elasticsearch + Kibana** - Centralized logging

## 🚀 Getting Started

1. **Save the startup script** as `manage.sh` and make it executable:

```bash
chmod +x manage.sh

```

1. **Initial setup:**

```bash
./manage.sh setup    # Creates directory structure
./manage.sh start    # Starts all services

```

1. **Development workflow:**

```bash
./manage.sh logs api-gateway  # View specific service logs
./manage.sh status           # Check service health
./manage.sh stop            # Stop everything

```

## 🔧 Key Features

- **Service Discovery**: Services communicate using Docker internal networking
- **Authentication**: JWT-based auth handled by API Gateway
- **Rate Limiting**: Built-in protection against abuse
- **Health Checks**: Each service exposes `/health` endpoint
- **Hot Reloading**: Code changes reflect immediately via volume mounts
- **Monitoring**: Full observability stack included

The API Gateway handles all routing and authentication, so your frontend only needs to connect to `http://localhost:3000`. Services can communicate with each other using their service names (e.g., `http://user-service:3001`).

Want me to show you how to implement a specific service next, like the User Service with authentication?

---