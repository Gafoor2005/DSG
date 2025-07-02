# Grafana Dashboard Import Guide

## Access Grafana
1. Open your browser and go to: http://localhost:3006
2. Login with default credentials:
   - Username: `admin`
   - Password: `admin`
   - You'll be prompted to change the password (you can skip this for development)

## Configure Prometheus Data Source

### Step 1: Add Prometheus Data Source
1. Click on "Configuration" (gear icon) in the left sidebar
2. Click on "Data Sources"
3. Click "Add data source"
4. Select "Prometheus"
5. Configure the data source:
   - **Name**: `Prometheus`
   - **URL**: `http://prometheus:9090` (or `http://localhost:9090` if that doesn't work)
   - **Access**: `Server (default)`
6. Click "Save & Test" - you should see "Data source is working"

## Import Dashboard JSONs

The following dashboard JSONs are available in the `docs/monitoring-setup.md` file:

### 1. API Gateway Dashboard
- Contains: Request rate, response times, error rates, active connections
- Metrics: `http_requests_total`, `http_request_duration_seconds`, `active_connections`

### 2. User Service Dashboard  
- Contains: Authentication metrics, request patterns, active users
- Metrics: `user_service_auth_attempts_total`, `user_service_http_requests_total`

### 3. System Overview Dashboard
- Contains: Node.js performance, memory usage, garbage collection
- Metrics: `nodejs_heap_size_used_bytes`, `nodejs_gc_duration_seconds`, `process_cpu_seconds_total`

## How to Import a Dashboard

1. Click the "+" icon in the left sidebar
2. Select "Import"
3. Copy and paste the JSON from `docs/monitoring-setup.md`
4. Click "Load"
5. Configure:
   - **Name**: Give it a descriptive name
   - **Prometheus**: Select your Prometheus data source
6. Click "Import"

## Verify Data is Flowing

After importing dashboards, you should see:
- Request rate graphs showing traffic to your services
- Response time histograms
- Error rate percentages
- System metrics like CPU and memory usage

If you don't see data:
1. Check that Prometheus is scraping targets: http://localhost:9090/targets
2. Verify metrics endpoints are working:
   - API Gateway: http://localhost:3000/metrics
   - User Service: http://localhost:3001/metrics
3. Check the time range in Grafana (last 15 minutes)

## Quick Verification Commands

```powershell
# Check if services are responding
Invoke-WebRequest -Uri "http://localhost:3000/health"
Invoke-WebRequest -Uri "http://localhost:3001/"

# Generate some test traffic
for ($i = 1; $i -le 10; $i++) {
    Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing | Out-Null
    Start-Sleep -Milliseconds 200
}
```

## Next Steps

1. Set up alerting rules in Prometheus
2. Configure notification channels in Grafana  
3. Add business-specific metrics to your services
4. Create custom dashboards for specific use cases
5. Set up log aggregation with the ELK stack (already running)
