# Monitoring Setup Documentation

## Overview

This document describes the monitoring and observability setup for the Social Platform microservices project using Prometheus and Grafana.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │  User Service   │    │   Grafana UI    │
│   (Port 3000)   │    │  (Port 3001)    │    │  (Port 3006)    │
│                 │    │                 │    │                 │
│  /metrics       │    │  /metrics       │    │  Dashboards     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │      Prometheus          │
                    │     (Port 9090)          │
                    │                          │
                    │   Metrics Collection     │
                    └──────────────────────────┘
```

## Components

### 1. Prometheus (Port 9090)
- **Purpose**: Metrics collection and storage
- **Configuration**: `monitoring/prometheus.yml`
- **Access**: http://localhost:9090

### 2. Grafana (Port 3006)
- **Purpose**: Data visualization and dashboards
- **Access**: http://localhost:3006
- **Credentials**: admin/admin

### 3. API Gateway Metrics (Port 3000/metrics)
- **Endpoint**: http://localhost:3000/metrics
- **Metrics Collected**:
  - HTTP request counts by method, route, status code
  - Request duration histograms
  - Active connections
  - Proxy errors by target service

### 4. User Service Metrics (Port 3001/metrics)
- **Endpoint**: http://localhost:3001/metrics (via API Gateway: http://localhost:3000/api/users/metrics)
- **Metrics Collected**:
  - HTTP request counts and durations
  - Authentication attempts (login/register success/failure)
  - Database query counts and durations
  - Active users and sessions

## Metrics Details

### API Gateway Metrics

| Metric Name | Type | Description | Labels |
|-------------|------|-------------|--------|
| `http_requests_total` | Counter | Total HTTP requests | method, route, status_code, service |
| `http_request_duration_seconds` | Histogram | Request duration | method, route, status_code, service |
| `active_connections` | Gauge | Active connections | service |
| `proxy_errors_total` | Counter | Proxy errors | target_service, error_type |

### User Service Metrics

| Metric Name | Type | Description | Labels |
|-------------|------|-------------|--------|
| `user_service_http_requests_total` | Counter | Total HTTP requests | method, route, status_code |
| `user_service_http_request_duration_seconds` | Histogram | Request duration | method, route, status_code |
| `user_service_auth_attempts_total` | Counter | Authentication attempts | type, result |
| `user_service_database_queries_total` | Counter | Database queries | operation, table |
| `user_service_database_query_duration_seconds` | Histogram | Query duration | operation, table |
| `user_service_active_users` | Gauge | Active users | - |
| `user_service_registered_users_total` | Gauge | Total registered users | - |
| `user_service_active_sessions` | Gauge | Active sessions | - |

## Setup Instructions

### 1. Install Dependencies

**API Gateway:**
```bash
cd api-gateway
npm install prom-client
```

**User Service:**
```bash
cd user-service
npm install prom-client
```

### 2. Start Services

```bash
# Start all services including monitoring
docker-compose up -d

# Or start specific services
docker-compose up -d prometheus grafana api-gateway user-service postgres redis
```

### 3. Verify Metrics Endpoints

**API Gateway Metrics:**
```bash
curl http://localhost:3000/metrics
```

**User Service Metrics:**
```bash
curl http://localhost:3001/metrics
```

**Prometheus Targets:**
- Open http://localhost:9090/targets
- Verify all targets are "UP"

### 4. Access Grafana

1. Open http://localhost:3006
2. Login with admin/admin
3. Add Prometheus data source:
   - URL: http://prometheus:9090
   - Save & Test

## Creating Dashboards

### Basic API Gateway Dashboard

1. Create new dashboard in Grafana
2. Add panels for:
   - **Request Rate**: `rate(http_requests_total[5m])`
   - **Error Rate**: `rate(http_requests_total{status_code=~"4..|5.."}[5m])`
   - **Response Time**: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
   - **Active Connections**: `active_connections`

### Basic User Service Dashboard

1. Create new dashboard
2. Add panels for:
   - **Authentication Success Rate**: `rate(user_service_auth_attempts_total{result="success"}[5m])`
   - **Authentication Failure Rate**: `rate(user_service_auth_attempts_total{result="failure"}[5m])`
   - **Database Query Rate**: `rate(user_service_database_queries_total[5m])`
   - **Active Users**: `user_service_active_users`

## Key Queries

### API Gateway Queries

```promql
# Request rate per service
rate(http_requests_total[5m])

# Error rate percentage
(rate(http_requests_total{status_code=~"4..|5.."}[5m]) / rate(http_requests_total[5m])) * 100

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Proxy errors by service
rate(proxy_errors_total[5m])
```

### User Service Queries

```promql
# Login success rate
rate(user_service_auth_attempts_total{type="login",result="success"}[5m])

# Login failure rate
rate(user_service_auth_attempts_total{type="login",result="failure"}[5m])

# Database query performance
histogram_quantile(0.95, rate(user_service_database_query_duration_seconds_bucket[5m]))

# Registration trends
increase(user_service_auth_attempts_total{type="register",result="success"}[1h])
```

## Troubleshooting

### Common Issues

1. **Metrics endpoint returns 404**
   - Verify service is running with metrics enabled
   - Check route configuration

2. **Prometheus can't scrape targets**
   - Verify Docker network connectivity
   - Check service names in prometheus.yml match Docker Compose service names

3. **Grafana can't connect to Prometheus**
   - Use `http://prometheus:9090` not `localhost:9090`
   - Verify both services are in same Docker network

### Checking Service Health

```bash
# Check if services are running
docker-compose ps

# View service logs
docker-compose logs prometheus
docker-compose logs grafana
docker-compose logs api-gateway
docker-compose logs user-service

# Test metrics endpoints
curl http://localhost:3000/metrics
curl http://localhost:3001/metrics
```

## Next Steps

### Phase 2: Enhanced Monitoring

1. **Add alerting rules** for critical metrics
2. **Implement log aggregation** with ELK stack
3. **Add business metrics** dashboards
4. **Set up notification channels** (Slack, email)

### Phase 3: Production Ready

1. **Add authentication** to Grafana
2. **Implement metric retention** policies
3. **Add backup and recovery** procedures
4. **Performance optimization** for high-volume environments

## Files Modified

### New Files Created
- `user-service/src/utils/metrics.js` - Metrics collection utilities
- `monitoring/prometheus.yml` - Prometheus configuration
- `docs/monitoring-setup.md` - This documentation

### Modified Files
- `api-gateway/package.json` - Added prom-client dependency
- `api-gateway/src/index.js` - Added metrics collection and endpoint
- `user-service/package.json` - Added prom-client dependency
- `user-service/src/index.js` - Added metrics middleware and endpoint
- `user-service/src/controllers/userController.js` - Added authentication tracking

## Quick Reference

| Service | URL | Purpose |
|---------|-----|---------|
| Prometheus | http://localhost:9090 | Metrics collection UI |
| Grafana | http://localhost:3006 | Dashboard UI (admin/admin) |
| API Gateway Metrics | http://localhost:3000/metrics | Raw metrics data |
| User Service Metrics | http://localhost:3001/metrics | Raw metrics data |

## Sample Dashboard Configs

Save these as JSON files and import into Grafana:

### API Gateway Dashboard
```json
{
  "dashboard": {
    "title": "API Gateway Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      }
    ]
  }
}
```

## Maintenance

- **Regular tasks**: Monitor disk usage for Prometheus data
- **Updates**: Keep Prometheus and Grafana images updated
- **Backup**: Export Grafana dashboards periodically
- **Security**: Change default Grafana password in production

## Monitoring Stack Status ✅ COMPLETE

### Current Status
- **Prometheus**: ✅ Running on http://localhost:9090
- **Grafana**: ✅ Running on http://localhost:3006
- **API Gateway Metrics**: ✅ Available at http://localhost:3000/metrics
- **User Service Metrics**: ✅ Available at http://localhost:3001/metrics
- **Data Collection**: ✅ All targets healthy and scraping successfully

### Verification Commands

```powershell
# Check all services are running
docker ps

# Verify Prometheus targets
Invoke-WebRequest -Uri "http://localhost:9090/targets"

# Test metrics endpoints
Invoke-WebRequest -Uri "http://localhost:3000/metrics"
Invoke-WebRequest -Uri "http://localhost:3001/metrics"

# Query metrics through Prometheus API
Invoke-WebRequest -Uri "http://localhost:9090/api/v1/query?query=up"
Invoke-WebRequest -Uri "http://localhost:9090/api/v1/query?query=http_requests_total"
```

### Access URLs
- **Grafana Dashboard**: http://localhost:3006 (admin/admin)
- **Prometheus UI**: http://localhost:9090
- **API Gateway Metrics**: http://localhost:3000/metrics
- **User Service Metrics**: http://localhost:3001/metrics

### Quick Dashboard Import

1. Access Grafana at http://localhost:3006
2. Login with admin/admin
3. Add Prometheus data source: `http://prometheus:9090`
4. Import the dashboard JSONs provided in this document
5. Dashboards should immediately show data from your services

### Ready for Production

Your monitoring stack is now:
- ✅ Collecting metrics from all services
- ✅ Storing time-series data in Prometheus
- ✅ Ready for dashboard visualization in Grafana
- ✅ Configured for future microservices expansion
- ✅ Providing comprehensive Node.js application insights

For detailed import instructions, see: `scripts/import-dashboards.md`
