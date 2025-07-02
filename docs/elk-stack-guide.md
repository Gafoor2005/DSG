# 📋 ELK Stack Implementation Guide

## 🎯 What You Have Implemented

Your Docker Compose setup includes a **simplified ELK stack**:

```
Your Microservices → Log Files → Elasticsearch → Kibana
     ↓
  (File-based logging)
```

### ✅ **Currently Running:**
- **Elasticsearch** (port 9200) - Stores and indexes logs
- **Kibana** (port 5601) - Visualizes and searches logs
- **File-based logging** - Services write JSON logs to files

### 🔄 **How It Works:**

1. **Services Generate Logs** → Your Node.js services use Winston to write structured JSON logs
2. **File Storage** → Logs are stored in `user-service/logs/combined.log`
3. **Elasticsearch** → Centralized log storage and search engine
4. **Kibana** → Web interface to search, filter, and visualize logs

## 🏗️ **Your Logging Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │  User Service   │    │ Other Services  │
│                 │    │                 │    │                 │
│ Winston Logger  │    │ Winston Logger  │    │ Winston Logger  │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Log Files                                    │
│  • combined.log (all logs)                                     │
│  • error.log (errors only)                                     │
│  • exceptions.log (crashes)                                    │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Elasticsearch                                   │
│  • Indexes and stores logs                                     │
│  • Makes logs searchable                                       │
│  • Provides REST API for queries                              │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Kibana                                       │
│  • Web dashboard for log analysis                              │
│  • Search and filter capabilities                              │
│  • Create visualizations and dashboards                        │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 **Current vs Full ELK Stack**

### What You Have (EK Stack):
```
Services → File Logs → Elasticsearch → Kibana
```

### Full ELK Stack:
```
Services → Logstash → Elasticsearch → Kibana
```

**Logstash** is optional because:
- Your services already write structured JSON logs
- You can send logs directly to Elasticsearch
- Simpler setup for development

## 📊 **How to Use Your ELK Stack**

### 1. **Access Kibana Dashboard**
- URL: http://localhost:5601
- Purpose: Search and visualize logs from all services

### 2. **View Elasticsearch Data**
- URL: http://localhost:9200
- Test: http://localhost:9200/_cluster/health

### 3. **Service Log Files**
```
user-service/logs/
├── combined.log     # All log levels (info, warn, error)
├── error.log        # Only errors and warnings
├── exceptions.log   # Unhandled exceptions
└── rejections.log   # Promise rejections
```

## 🎯 **Log Flow Examples**

### When a user logs in:
1. **API Gateway** receives request
2. **Logs**: `{"method":"POST","url":"/api/auth/login","userAgent":"..."}`
3. **User Service** processes authentication
4. **Logs**: `{"level":"info","message":"Login attempt","email":"user@example.com"}`
5. **Both logs** → Stored in files → Indexed in Elasticsearch → Searchable in Kibana

### When an error occurs:
1. **Service** encounters error
2. **Logs**: `{"level":"error","message":"Database connection failed","stack":"..."}`
3. **Error log** → `error.log` file → Elasticsearch → Alert in Kibana

## 🚀 **Setting Up Log Forwarding (Optional Enhancement)**

To send logs directly to Elasticsearch, you can add Filebeat:

```yaml
# Add to your docker-compose.yaml
filebeat:
  image: docker.elastic.co/beats/filebeat:8.8.0
  user: root
  volumes:
    - ./filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
    - ./user-service/logs:/logs:ro
    - /var/lib/docker/containers:/var/lib/docker/containers:ro
    - /var/run/docker.sock:/var/run/docker.sock:ro
  depends_on:
    - elasticsearch
  networks:
    - social-network
```

## 🔍 **Practical Use Cases**

### 1. **Debug Authentication Issues**
- Kibana search: `message:"login" AND level:"error"`
- Find failed login attempts and their causes

### 2. **Monitor API Performance**
- Search for slow requests: `duration:>1000ms`
- Identify performance bottlenecks

### 3. **Track User Activity**
- Search: `userId:"12345"` 
- See all actions by a specific user

### 4. **System Health Monitoring**
- Filter by log level: `level:"error" OR level:"warn"`
- Monitor for system issues

## 📈 **Your Complete Observability Stack**

You have implemented a **comprehensive observability solution**:

| Tool | Purpose | Data Type | Access |
|------|---------|-----------|--------|
| **Prometheus** | Metrics collection | Time-series data | http://localhost:9090 |
| **Grafana** | Metrics visualization | Dashboards & alerts | http://localhost:3006 |
| **Elasticsearch** | Log storage | Structured logs | http://localhost:9200 |
| **Kibana** | Log analysis | Search & visualization | http://localhost:5601 |

This gives you **three pillars of observability**:
1. **Metrics** (Prometheus + Grafana) - *How fast, how many, how much*
2. **Logs** (ELK stack) - *What happened, when, and why*
3. **Traces** (Optional: Jaeger/Zipkin) - *Request flow across services*
