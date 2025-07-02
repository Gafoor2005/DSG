# Grafana Dashboard Import Instructions

## 🎯 Ready-to-Import Dashboard Files

You now have 3 complete dashboard JSON files ready for import:

1. **`api-gateway-dashboard.json`** - API Gateway metrics and performance
2. **`user-service-dashboard.json`** - User Service authentication and user metrics  
3. **`system-overview-dashboard.json`** - Node.js system performance and health

## 📥 How to Import Dashboards

### Step 1: Access Grafana
- Open: **http://localhost:3006**
- Login: **admin / admin** (change password or skip)

### Step 2: Add Prometheus Data Source (One-time setup)
1. Click **Configuration (⚙️)** → **Data Sources**
2. Click **"Add data source"**
3. Select **"Prometheus"**
4. Configure:
   - **Name**: `Prometheus`
   - **URL**: `http://prometheus:9090`
   - **Access**: `Server (default)`
5. Click **"Save & Test"** - should show ✅ "Data source is working"

### Step 3: Import Each Dashboard
1. Click **"+" (Create)** → **"Import"**
2. Copy the entire JSON content from one of the dashboard files
3. Paste into the **"Import via panel json"** text area
4. Click **"Load"**
5. Verify the data source is set to **"Prometheus"**
6. Click **"Import"**
7. Repeat for all 3 dashboards

## 🔍 Dashboard Features

### API Gateway Dashboard
- **Request Rate**: Real-time requests per second by endpoint
- **Active Connections**: Current WebSocket/HTTP connections
- **Error Rate**: Percentage of 4xx/5xx responses
- **Response Time**: 95th percentile latency
- **HTTP Status Codes**: Breakdown of response codes
- **Response Time Percentiles**: 50th, 95th, 99th percentile trends

### User Service Dashboard  
- **Request Rate**: User service endpoint performance
- **Active Users**: Currently logged-in users
- **Authentication Events**: Login/registration success/failure
- **Response Times**: Service latency metrics
- **Database Performance**: Query rates and duration
- **User Metrics**: Total registered users, active sessions

### System Overview Dashboard
- **CPU Usage**: Process CPU utilization
- **Memory Usage**: Heap memory used vs total
- **Event Loop Lag**: Node.js event loop performance
- **Garbage Collection**: GC frequency and duration
- **Active Handles/Resources**: Node.js resource monitoring

## 🚀 Quick Test

After importing, generate some traffic to see live data:

```powershell
# Generate API Gateway traffic
for ($i = 1; $i -le 20; $i++) {
    Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing | Out-Null
    Start-Sleep -Milliseconds 300
}

# Test authentication endpoint
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body '{"email":"test@example.com","password":"test"}' -ContentType "application/json"
```

## 🎨 Customization

You can modify these dashboards by:
- Adding new panels with custom queries
- Changing time ranges and refresh intervals  
- Setting up alerts and notifications
- Creating template variables for filtering

## 📊 Expected Results

Within 1-2 minutes of importing, you should see:
- Live request rate graphs
- Memory and CPU usage trends
- Response time metrics
- Error rates and status code distributions

Your monitoring stack is now complete with professional dashboards! 🎉
