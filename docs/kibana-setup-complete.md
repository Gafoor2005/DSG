# 🚀 Kibana Setup Guide - Complete Configuration

## ✅ Current Status
- **Kibana**: ✅ Running at `http://localhost:5601`
- **Elasticsearch**: ✅ Healthy with 338+ log entries
- **Microservices**: ✅ Actively logging to Elasticsearch
- **Log Index**: `microservices-logs` with structured data

## 📋 Step-by-Step Kibana Setup

### Step 1: Access Kibana
1. Open your web browser
2. Navigate to: `http://localhost:5601`
3. Wait for Kibana to load (may take 30-60 seconds)

### Step 2: Create Index Pattern
1. Click **☰ Menu** (hamburger menu) in the top-left
2. Go to **Stack Management** (bottom of menu)
3. Under **Kibana**, click **Index Patterns**
4. Click **Create index pattern**
5. Enter index pattern: `microservices-logs*`
6. Click **Next step**
7. Select **@timestamp** as the Time field
8. Click **Create index pattern**

### Step 3: Explore Your Logs
1. Click **☰ Menu** → **Analytics** → **Discover**
2. Select your `microservices-logs*` index pattern
3. Set time range to "Last 24 hours" or "Last 1 hour"
4. You should see your microservice logs!

### Step 4: Create Essential Dashboards

#### Dashboard 1: Service Overview
1. Go to **☰ Menu** → **Analytics** → **Dashboard**
2. Click **Create dashboard**
3. Click **Create visualization**

**Visualization 1 - Request Volume by Service:**
- Visualization type: **Vertical Bar Chart**
- Y-axis: Count
- X-axis: Terms aggregation on `fields.service.keyword`
- Save as: "Request Volume by Service"

**Visualization 2 - Error Rate:**
- Visualization type: **Metric**
- Filter: `fields.statusCode:>=400`
- Metric: Count
- Save as: "Error Count"

**Visualization 3 - Response Time:**
- Visualization type: **Line Chart**
- Y-axis: Average of `fields.duration`
- X-axis: Date Histogram on `@timestamp`
- Split series: Terms on `fields.service.keyword`
- Save as: "Response Time by Service"

#### Dashboard 2: Error Monitoring
1. Create new dashboard
2. Add visualizations for:
   - Error count by status code
   - Error trends over time
   - Top error messages

### Step 5: Useful Search Queries

Copy these into the Kibana search bar:

```bash
# All errors (4xx and 5xx)
fields.statusCode:>=400

# API Gateway logs only
fields.service:"api-gateway"

# User Service logs only  
fields.service:"user-service"

# Slow requests (over 1 second)
fields.duration:>1000ms

# Successful requests only
fields.statusCode:[200 TO 299]

# POST requests only
fields.method:"POST"

# Health check requests
fields.url:"/health"
```

## 🎯 Essential Kibana Features

### 1. Discover Tab
- **Purpose**: Explore and search logs
- **Use**: Debug issues, trace requests, analyze patterns
- **Tip**: Use the time picker to narrow down timeframes

### 2. Dashboard Tab
- **Purpose**: Visual monitoring and alerting
- **Use**: Real-time monitoring, trend analysis
- **Tip**: Create separate dashboards for different teams

### 3. Visualize Tab
- **Purpose**: Create charts and graphs
- **Use**: Custom metrics visualization
- **Tip**: Start with simple charts before complex ones

## 📊 Sample Visualizations You Can Create

### Performance Monitoring:
1. **Average Response Time** - Line chart over time
2. **Request Volume** - Bar chart by service
3. **Error Rate Percentage** - Gauge visualization
4. **Status Code Distribution** - Pie chart

### Error Analysis:
1. **Error Timeline** - Area chart of errors over time
2. **Error by Service** - Bar chart
3. **Top Error URLs** - Data table
4. **Error Rate vs Success Rate** - Dual-axis chart

### User Activity:
1. **Requests by User** - Bar chart (when authentication is added)
2. **API Endpoint Usage** - Heat map
3. **Geographic Request Distribution** - Map (if IP logging added)

## 🔍 Log Structure Reference

Your logs have this structure:
```json
{
  "@timestamp": "2025-07-01T10:51:38.050Z",
  "message": "Request completed",
  "severity": "info",
  "fields": {
    "service": "api-gateway",
    "version": "1.0.0", 
    "method": "GET",
    "url": "/metrics",
    "statusCode": 200,
    "duration": "13ms",
    "contentLength": 0,
    "userId": "anonymous"
  }
}
```

### Available Fields for Filtering:
- `@timestamp` - Log timestamp
- `severity` - Log level (info, warn, error)
- `fields.service` - Service name
- `fields.method` - HTTP method
- `fields.url` - Request URL
- `fields.statusCode` - HTTP status code
- `fields.duration` - Response time
- `fields.userId` - User identifier

## 🚨 Setting Up Alerts

### 1. Watcher Alerts (Advanced)
- Monitor error rates
- Alert on service downtime
- Track performance degradation

### 2. Simple Monitoring
- Create saved searches for errors
- Set up email notifications
- Use dashboard auto-refresh

## 🛠️ Troubleshooting

### Issue: "No data" in Discover
**Solution:**
1. Check time range (expand to "Last 7 days")
2. Verify index pattern: `microservices-logs*`
3. Refresh index pattern: **Stack Management** → **Index Patterns** → **Refresh**

### Issue: Visualizations not showing data
**Solution:**
1. Check field names (use autocomplete)
2. Verify time range
3. Check filters are not too restrictive

### Issue: Slow Kibana performance
**Solution:**
1. Use more specific time ranges
2. Add filters to reduce data volume
3. Limit dashboard visualizations

## 🎉 Your Setup is Complete!

You now have:
- ✅ **338+ logs** flowing from microservices to Elasticsearch
- ✅ **Kibana ready** for visualization and monitoring
- ✅ **Structured logging** with searchable fields
- ✅ **Real-time log ingestion** from API Gateway and User Service

## 🚀 Next Steps

1. **Create your first dashboard** using the steps above
2. **Set up monitoring alerts** for critical errors
3. **Add more services** to the logging pipeline
4. **Implement log retention policies** for production

**Your ELK stack is fully operational! 🎯**
