# 📋 Complete Logging & Monitoring Guide

## 🎯 Understanding Your Monitoring Stack

### 📊 **Grafana** - Visual Metrics Dashboard
**Purpose**: Real-time performance monitoring and visualization
**Access**: http://localhost:3006 (admin/admin)

**What it shows**:
- 📈 **Performance Trends**: Request rates, response times, CPU/memory usage
- 🚨 **Health Status**: Error rates, active connections, system health
- 👥 **Business Metrics**: User logins, registrations, active sessions
- ⚡ **Real-time Alerts**: When things go wrong (when configured)

**Use cases**:
- "Is my API slow right now?"
- "How many users logged in today?"
- "Are we having more errors than usual?"
- "Is the server running out of memory?"

### 🔍 **Kibana** - Log Search & Analysis
**Purpose**: Search, analyze, and visualize log data
**Access**: http://localhost:5601

**What it shows**:
- 🔎 **Log Search**: Find specific errors, user actions, debug info
- 📋 **Log Patterns**: Discover trends in your application behavior
- 🕵️ **Debugging**: Trace user requests across multiple services
- 📊 **Log Analytics**: Visualize log data over time

**Use cases**:
- "Show me all errors from the last hour"
- "What did user john@example.com do today?"
- "Find all failed login attempts"
- "Show me API calls that took longer than 5 seconds"

## 📝 Where to Find Your Logs

### 1. **File-Based Logs** (Local Development)
```
📁 user-service/logs/
├── 📄 combined.log     # All logs (info, warn, error)
├── 📄 error.log        # Only errors and warnings  
├── 📄 exceptions.log   # Unhandled exceptions
└── 📄 rejections.log   # Promise rejections
```

**View logs in real-time**:
```powershell
# Watch user service logs live
Get-Content "user-service\logs\combined.log" -Wait -Tail 20

# View only errors
Get-Content "user-service\logs\error.log" -Tail 50
```

### 2. **Docker Container Logs** (Production-like)
```powershell
# Real-time logs from containers
docker logs -f dsg-user-service-1
docker logs -f dsg-api-gateway-1
docker logs -f dsg-prometheus-1

# Last 100 lines
docker logs --tail 100 dsg-user-service-1

# Logs from last hour
docker logs --since 1h dsg-user-service-1
```

### 3. **Kibana Dashboard** (Centralized Log Analysis)
- **URL**: http://localhost:5601
- **Setup**: Configure index patterns for your services
- **Features**: Search, filter, visualize logs from all services

### 4. **Prometheus Logs** (System Metrics)
- **URL**: http://localhost:9090
- **Purpose**: Query and explore metrics data
- **Use**: Debug performance issues, create custom dashboards

## 🔧 Quick Log Commands

### View Recent Activity
```powershell
# Show last 20 log entries with timestamps
Get-Content "user-service\logs\combined.log" -Tail 20 | ConvertFrom-Json | Format-Table timestamp, level, message -AutoSize

# Show only errors
Get-Content "user-service\logs\error.log" -Tail 10

# Watch logs in real-time
Get-Content "user-service\logs\combined.log" -Wait -Tail 5
```

### Docker Log Commands
```powershell
# Follow logs for specific service
docker logs -f dsg-user-service-1

# Search for specific text in logs
docker logs dsg-user-service-1 2>&1 | Select-String "error"

# Export logs to file
docker logs dsg-user-service-1 > user-service-logs.txt
```

## 🎯 Practical Use Cases

### 🚨 **Troubleshooting Scenarios**

1. **"My API is slow"**
   - **Grafana**: Check response time dashboards
   - **Logs**: `docker logs dsg-api-gateway-1 | Select-String "slow\|timeout"`

2. **"Users can't log in"**
   - **Grafana**: Check authentication failure rates
   - **Logs**: `Get-Content user-service\logs\combined.log | Select-String "login\|auth"`

3. **"Server is crashing"**
   - **Grafana**: Check memory/CPU usage
   - **Logs**: `Get-Content user-service\logs\exceptions.log`

4. **"Finding a specific user's activity"**
   - **Kibana**: Search for user ID or email
   - **Logs**: `Get-Content user-service\logs\combined.log | Select-String "user123"`

### 🔍 **Log Analysis Examples**

```powershell
# Find all authentication attempts
Get-Content "user-service\logs\combined.log" | ConvertFrom-Json | Where-Object {$_.message -like "*auth*"}

# Count requests by status code
docker logs dsg-api-gateway-1 | Select-String "statusCode" | Group-Object

# Find slow requests (>1 second)
Get-Content "user-service\logs\combined.log" | ConvertFrom-Json | Where-Object {$_.duration -like "*ms" -and [int]($_.duration -replace "ms","") -gt 1000}
```

## 🎪 Complete Monitoring Workflow

1. **📊 Start with Grafana** - Get overall health picture
2. **🔍 Drill down with logs** - Investigate specific issues  
3. **📋 Use Kibana** - For complex log analysis
4. **⚡ Set up alerts** - Be notified of problems automatically

Your monitoring stack gives you complete visibility into your microservices! 🚀
