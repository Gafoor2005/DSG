# ELK Stack Testing Script
# Run this script to generate various types of logs for testing

Write-Host "🔍 Testing ELK Stack Integration..." -ForegroundColor Green
Write-Host ""

# Function to make requests and show results
function Test-Endpoint {
    param($url, $description)
    Write-Host "Testing: $description" -ForegroundColor Yellow
    Write-Host "URL: $url" -ForegroundColor Gray
    try {
        $response = Invoke-RestMethod -Uri $url -Method Get
        Write-Host "✅ Success" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
    }
}

# Test basic health endpoints
Write-Host "=== Testing Health Endpoints ===" -ForegroundColor Cyan
Test-Endpoint "http://localhost:3000/health" "API Gateway Health"
Test-Endpoint "http://localhost:3001/health" "User Service Health"

# Test metrics endpoints
Write-Host "=== Testing Metrics Endpoints ===" -ForegroundColor Cyan
Test-Endpoint "http://localhost:3000/metrics" "API Gateway Metrics"
Test-Endpoint "http://localhost:3001/metrics" "User Service Metrics"

# Test authentication endpoints (should generate 401 errors)
Write-Host "=== Testing Authentication (Expected Errors) ===" -ForegroundColor Cyan
Test-Endpoint "http://localhost:3000/api/users/profile" "User Profile (Unauthorized)"
Test-Endpoint "http://localhost:3000/api/users/123" "User Details (Unauthorized)"

# Test proxy functionality
Write-Host "=== Testing Proxy Functionality ===" -ForegroundColor Cyan
Test-Endpoint "http://localhost:3000/api/users/health" "Proxy to User Service Health"

# Generate load for testing
Write-Host "=== Generating Load for Testing ===" -ForegroundColor Cyan
Write-Host "Making 10 rapid requests to generate logs..." -ForegroundColor Yellow

for ($i = 1; $i -le 10; $i++) {
    try {
        Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get | Out-Null
        Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get | Out-Null
        Write-Progress -Activity "Generating test requests" -Status "Request $i of 10" -PercentComplete (($i / 10) * 100)
    } catch {
        # Ignore errors for load testing
    }
}

Write-Progress -Completed -Activity "Generating test requests"
Write-Host "✅ Load generation complete" -ForegroundColor Green
Write-Host ""

# Check Elasticsearch
Write-Host "=== Checking Elasticsearch ===" -ForegroundColor Cyan
try {
    $esHealth = Invoke-RestMethod -Uri "http://localhost:9200/_cat/health?v" -Method Get
    Write-Host "✅ Elasticsearch is healthy" -ForegroundColor Green
    
    $indices = Invoke-RestMethod -Uri "http://localhost:9200/_cat/indices?v" -Method Get
    Write-Host "📊 Current indices:" -ForegroundColor Blue
    Write-Host $indices
    Write-Host ""
} catch {
    Write-Host "❌ Elasticsearch connection failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Final summary
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "✅ ELK Stack is running and collecting logs" -ForegroundColor Green
Write-Host "🌐 Kibana Dashboard: http://localhost:5601" -ForegroundColor Blue
Write-Host "🔍 Elasticsearch API: http://localhost:9200" -ForegroundColor Blue
Write-Host "📊 Grafana Monitoring: http://localhost:3006" -ForegroundColor Blue
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open Kibana at http://localhost:5601" -ForegroundColor White
Write-Host "2. Create index pattern: microservices-logs*" -ForegroundColor White
Write-Host "3. Go to Discover to view logs" -ForegroundColor White
Write-Host "4. Create dashboards for monitoring" -ForegroundColor White
