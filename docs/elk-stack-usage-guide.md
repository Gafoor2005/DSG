# ELK Stack Usage Guide

## Overview
Your microservices architecture now includes a fully integrated ELK (Elasticsearch, Logstash, Kibana) stack for centralized logging and monitoring. All logs from your services are automatically sent to Elasticsearch and can be visualized in Kibana.

## Current Status ✅
- **Elasticsearch**: Running on `http://localhost:9200`
- **Kibana**: Running on `http://localhost:5601`
- **API Gateway**: Logging with Winston + Elasticsearch transport
- **User Service**: Logging with Winston + Elasticsearch transport
- **Log Index**: `microservices-logs` with 176+ documents

## Log Structure
Each log entry contains:
```json
{
  "@timestamp": "2025-07-01T10:39:25.121Z",
  "message": "Request completed",
  "severity": "info",
  "fields": {
    "service": "api-gateway",
    "version": "1.0.0",
    "method": "GET",
    "url": "/metrics",
    "statusCode": 200,
    "duration": "4ms",
    "contentLength": 0,
    "userId": "anonymous"
  }
}
```

## Using Kibana for Log Analysis

### 1. Setting Up Index Patterns
1. Open Kibana at `http://localhost:5601`
2. Go to **Stack Management** → **Index Patterns**
3. Create index pattern: `microservices-logs*`
4. Select `@timestamp` as the time field

### 2. Essential Kibana Dashboards

#### Service Performance Dashboard
- **Metric**: Request duration by service
- **Visualization**: Line chart showing `fields.duration` over time
- **Filter**: Group by `fields.service`

#### Error Monitoring Dashboard
- **Metric**: Error count by status code
- **Visualization**: Bar chart of HTTP status codes
- **Filter**: `fields.statusCode >= 400`

#### Service Activity Dashboard
- **Metric**: Request volume by service
- **Visualization**: Area chart of request counts
- **Filter**: Group by `fields.service` and `fields.method`

### 3. Useful Kibana Queries

#### Find all errors:
```
fields.statusCode:>=400
```

#### Find API Gateway logs:
```
fields.service:"api-gateway"
```

#### Find slow requests (>1s):
```
fields.duration:>1000ms
```

#### Find specific user activities:
```
fields.userId:"user123"
```

## Elasticsearch Direct Queries

### Check cluster health:
```bash
curl "http://localhost:9200/_cat/health?v"
```

### View all indices:
```bash
curl "http://localhost:9200/_cat/indices?v"
```

### Get recent logs:
```bash
curl "http://localhost:9200/microservices-logs/_search?size=10&sort=@timestamp:desc"
```

### Search for errors:
```bash
curl -X POST "http://localhost:9200/microservices-logs/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "range": {
      "fields.statusCode": {
        "gte": 400
      }
    }
  },
  "sort": [
    {
      "@timestamp": {
        "order": "desc"
      }
    }
  ]
}'
```

## Log Levels and Categories

### Current Log Types:
1. **Request Logs**: Every HTTP request/response
2. **Error Logs**: Application errors and exceptions
3. **System Logs**: Service startup/shutdown events
4. **Database Logs**: Connection and query information
5. **Authentication Logs**: Login/logout events

### Log Levels:
- `error`: Critical errors requiring immediate attention
- `warn`: Warning conditions
- `info`: Informational messages (default for requests)
- `debug`: Detailed debug information (development only)

## Monitoring Best Practices

### 1. Set Up Alerts
Create Kibana alerts for:
- Error rate > 5% in 5 minutes
- Response time > 2 seconds average
- Service downtime detection

### 2. Log Retention
- Current setup: No retention policy (dev environment)
- Production recommendation: Keep logs for 30-90 days
- Archive older logs to cheaper storage

### 3. Performance Optimization
- Monitor Elasticsearch disk usage
- Use index lifecycle management (ILM)
- Configure proper shard sizing

## Development Workflow

### 1. Testing Log Integration
Generate test logs:
```bash
# Test health endpoints
curl http://localhost:3000/health
curl http://localhost:3001/health

# Test authentication (should log 401 error)
curl http://localhost:3000/api/users/profile

# Test proxy functionality
curl http://localhost:3000/api/users/health
```

### 2. Debugging with Logs
1. Check recent logs in Kibana Discover
2. Filter by service and time range
3. Look for error patterns and correlation IDs
4. Use log context to trace request flows

### 3. Adding New Services
When adding new microservices:
1. Add Winston + Elasticsearch transport to `package.json`
2. Copy logger configuration from existing services
3. Update service name in logger config
4. Test log generation and verify in Kibana

## Troubleshooting

### Common Issues:

#### Logs not appearing in Elasticsearch:
1. Check service logs: `docker-compose logs [service-name]`
2. Verify Elasticsearch health: `curl localhost:9200/_cat/health`
3. Check Winston configuration for correct Elasticsearch URL

#### Kibana not showing data:
1. Verify index pattern is correct: `microservices-logs*`
2. Check time range in Kibana (default may be too narrow)
3. Refresh index pattern if new fields added

#### Performance issues:
1. Monitor Elasticsearch resource usage
2. Check Docker container memory limits
3. Consider index optimization for large log volumes

## Next Steps

### Recommended Enhancements:
1. **Structured Logging**: Add correlation IDs for request tracing
2. **Log Aggregation**: Implement log sampling for high-volume endpoints
3. **Alerting**: Set up Watcher or ElastAlert for proactive monitoring
4. **Security**: Add authentication to Elasticsearch/Kibana in production
5. **Backup**: Implement regular Elasticsearch snapshots

### Production Considerations:
1. Use dedicated Elasticsearch cluster
2. Implement proper security (TLS, authentication)
3. Configure log rotation and retention policies
4. Set up monitoring for the ELK stack itself
5. Consider using Logstash for complex log processing

## Resources
- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/)
- [Kibana User Guide](https://www.elastic.co/guide/en/kibana/current/)
- [Winston Documentation](https://github.com/winstonjs/winston)
- [Winston Elasticsearch Transport](https://github.com/vanthome/winston-elasticsearch)
