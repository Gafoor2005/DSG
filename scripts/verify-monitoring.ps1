#!/usr/bin/env pwsh
# Monitoring Stack Verification Script
# Run this to verify that all monitoring components are working correctly

Write-Host "Monitoring Stack Health Check" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Check Docker containers
Write-Host "`nChecking Docker containers..." -ForegroundColor Yellow
$containers = docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
Write-Host $containers

# Check Prometheus targets
Write-Host "`nChecking Prometheus targets..." -ForegroundColor Yellow
try {
    $targets = Invoke-WebRequest -Uri "http://localhost:9090/api/v1/targets" -UseBasicParsing
    $targetsData = ($targets.Content | ConvertFrom-Json).data.activeTargets
    
    foreach ($target in $targetsData) {
        $status = if ($target.health -eq "up") { "[OK]" } else { "[FAIL]" }
        Write-Host "$status $($target.job) - $($target.health)" -ForegroundColor $(if ($target.health -eq "up") { "Green" } else { "Red" })
    }
} catch {
    Write-Host "[FAIL] Could not connect to Prometheus" -ForegroundColor Red
}

# Test metrics endpoints
Write-Host "`nTesting metrics endpoints..." -ForegroundColor Yellow

# API Gateway
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/metrics" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        $metricsCount = ($response.Content -split "`n" | Where-Object { $_ -match "^[a-zA-Z]" }).Count
        Write-Host "[OK] API Gateway metrics - $metricsCount metrics available" -ForegroundColor Green
    }
} catch {
    Write-Host "[FAIL] API Gateway metrics endpoint failed" -ForegroundColor Red
}

# User Service
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/metrics" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        $metricsCount = ($response.Content -split "`n" | Where-Object { $_ -match "^[a-zA-Z]" }).Count
        Write-Host "[OK] User Service metrics - $metricsCount metrics available" -ForegroundColor Green
    }
} catch {
    Write-Host "[FAIL] User Service metrics endpoint failed" -ForegroundColor Red
}

# Test Prometheus queries
Write-Host "`nTesting Prometheus queries..." -ForegroundColor Yellow

try {
    # Query for service uptime
    $upQuery = Invoke-WebRequest -Uri "http://localhost:9090/api/v1/query?query=up" -UseBasicParsing
    $upData = ($upQuery.Content | ConvertFrom-Json).data.result
    Write-Host "[OK] Services monitored: $($upData.Count)" -ForegroundColor Green
    
    # Query for HTTP requests
    $httpQuery = Invoke-WebRequest -Uri "http://localhost:9090/api/v1/query?query=http_requests_total" -UseBasicParsing
    $httpData = ($httpQuery.Content | ConvertFrom-Json).data.result
    if ($httpData.Count -gt 0) {
        Write-Host "[OK] HTTP metrics collected: $($httpData.Count) series" -ForegroundColor Green
    } else {
        Write-Host "[WARN] No HTTP metrics found - generate some traffic first" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[FAIL] Prometheus query failed" -ForegroundColor Red
}

# Check Grafana
Write-Host "`nChecking Grafana availability..." -ForegroundColor Yellow
try {
    $grafana = Invoke-WebRequest -Uri "http://localhost:3006/api/health" -UseBasicParsing
    if ($grafana.StatusCode -eq 200) {
        Write-Host "[OK] Grafana is running and healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "[FAIL] Grafana is not accessible" -ForegroundColor Red
}

# Summary
Write-Host "`nSummary:" -ForegroundColor Green
Write-Host "==========" -ForegroundColor Green
Write-Host "Grafana Dashboard: http://localhost:3006 (admin/admin)"
Write-Host "Prometheus UI: http://localhost:9090"
Write-Host "API Gateway Metrics: http://localhost:3000/metrics"
Write-Host "User Service Metrics: http://localhost:3001/metrics"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Import dashboard JSONs from docs/monitoring-setup.md into Grafana"
Write-Host "2. Generate test traffic to see metrics in action"
Write-Host "3. Set up alerting rules for production use"
Write-Host ""
Write-Host "Monitoring stack is ready!" -ForegroundColor Green
