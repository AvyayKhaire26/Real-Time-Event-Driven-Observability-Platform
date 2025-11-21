# ================== Complete System Load Test (RCA/LLM Ready) ==================
param(
  [string]$GatewayUrl = "http://localhost:3000",
  [int]$RequestsPerService = 200,
  [int]$DelayMs = 100
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🚀 Starting Complete System Load Test (RCA/LLM Ready)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Known IDs (from your environment/logs)
$productId = "f62829a1-59cc-44a4-b9bf-cd84200aa310"
$orderId   = "7e8658c0-89e8-4fe8-9291-722cbc582c26"

# Run ID and request log CSV (for metrics / precision-recall later)
$runId   = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$logFile = "requests-log-$runId.csv"
"runId,traceId,service,method,path,statusCode,endTimeUtc,latencyMs" | Out-File -FilePath $logFile -Encoding utf8

function New-TraceId {
  return [guid]::NewGuid().ToString()
}

function Invoke-JsonPost {
  param(
    [string]$Url,
    [hashtable]$BodyObject,
    [string]$TraceId
  )
  $json = $BodyObject | ConvertTo-Json -Depth 10
  return Invoke-WebRequest `
    -Uri $Url `
    -Method POST `
    -ContentType "application/json" `
    -Body $json `
    -Headers @{ "X-Trace-Id" = $TraceId } `
    -UseBasicParsing `
    -TimeoutSec 30
}

function Invoke-JsonGet {
  param(
    [string]$Url,
    [string]$TraceId
  )
  return Invoke-WebRequest `
    -Uri $Url `
    -Method GET `
    -Headers @{ "X-Trace-Id" = $TraceId } `
    -UseBasicParsing `
    -TimeoutSec 30
}

function Log-Request {
  param(
    [string]$runId,
    [string]$trace,
    [string]$service,
    [string]$method,
    [string]$path,
    [int]$status,
    [datetime]$endTimeUtc,
    [double]$latencyMs
  )
  # endTimeUtc is already UTC
  $endStr = $endTimeUtc.ToString("o")  # ISO 8601
  "$runId,$trace,$service,$method,$path,$status,$endStr,$latencyMs" | Add-Content $logFile
}

# 1) Product Service (GET /products)
Write-Host "`n📦 Product Service (GET /products)" -ForegroundColor Yellow
$productOk = 0
for ($i=1; $i -le $RequestsPerService; $i++) {
  $trace   = New-TraceId
  $status  = 0
  $start   = (Get-Date).ToUniversalTime()
  $end     = $start
  $latency = 0.0
  try {
    $resp   = Invoke-JsonGet "$GatewayUrl/products" $trace
    $end    = (Get-Date).ToUniversalTime()
    $status = [int]$resp.StatusCode
    $latency = ($end - $start).TotalMilliseconds
    $productOk++
    if ($i % 10 -eq 0) { Write-Host "   ✓ $i/$RequestsPerService" -ForegroundColor Green }
  } catch {
    $end    = (Get-Date).ToUniversalTime()
    $status = 500
    $latency = ($end - $start).TotalMilliseconds
    Write-Host "   ✗ $i failed" -ForegroundColor Red
  }
  Log-Request $runId $trace "product-service" "GET" "/products" $status $end $latency
  Start-Sleep -Milliseconds $DelayMs
}
Write-Host "   ✅ Product OK: $productOk/$RequestsPerService" -ForegroundColor Green

# 2) Order Service (GET /orders)
Write-Host "`n📋 Order Service (GET /orders)" -ForegroundColor Yellow
$orderOk = 0
for ($i=1; $i -le $RequestsPerService; $i++) {
  $trace   = New-TraceId
  $status  = 0
  $start   = (Get-Date).ToUniversalTime()
  $end     = $start
  $latency = 0.0
  try {
    $resp   = Invoke-JsonGet "$GatewayUrl/orders" $trace
    $end    = (Get-Date).ToUniversalTime()
    $status = [int]$resp.StatusCode
    $latency = ($end - $start).TotalMilliseconds
    $orderOk++
    if ($i % 10 -eq 0) { Write-Host "   ✓ $i/$RequestsPerService" -ForegroundColor Green }
  } catch {
    $end    = (Get-Date).ToUniversalTime()
    $status = 500
    $latency = ($end - $start).TotalMilliseconds
    Write-Host "   ✗ $i failed" -ForegroundColor Red
  }
  Log-Request $runId $trace "order-service" "GET" "/orders" $status $end $latency
  Start-Sleep -Milliseconds $DelayMs
}
Write-Host "   ✅ Order OK: $orderOk/$RequestsPerService" -ForegroundColor Green

# 3) Payment Service (POST /payments/process)
Write-Host "`n💳 Payment Service (POST /payments/process)" -ForegroundColor Yellow
$payOk = 0; $payFail = 0
for ($i=1; $i -le $RequestsPerService; $i++) {
  $trace   = New-TraceId
  $status  = 0
  $body = @{
    orderId = $orderId
    amount = 2599.98
    currency = "INR"
    method = "CREDIT_CARD"
    customerDetails = @{
      name  = "Test User $i"
      email = "user$i@example.com"
      phone = "+919876543210"
    }
  }
  $start   = (Get-Date).ToUniversalTime()
  $end     = $start
  $latency = 0.0
  try {
    $resp   = Invoke-JsonPost "$GatewayUrl/payments/process" $body $trace
    $end    = (Get-Date).ToUniversalTime()
    $status = [int]$resp.StatusCode
    $latency = ($end - $start).TotalMilliseconds
    if ($status -ge 500) {
      $payFail++
      Write-Host "   ✗ $i failed (status $status)" -ForegroundColor Yellow
    } else {
      $payOk++
      if ($i % 10 -eq 0) { Write-Host "   ✓ $i/$RequestsPerService" -ForegroundColor Green }
    }
  } catch {
    $end    = (Get-Date).ToUniversalTime()
    $status = 500
    $latency = ($end - $start).TotalMilliseconds
    $payFail++
    Write-Host "   ✗ $i failed (exception)" -ForegroundColor Yellow
  }
  Log-Request $runId $trace "payment-service" "POST" "/payments/process" $status $end $latency
  Start-Sleep -Milliseconds $DelayMs
}
$payFailRate = [math]::Round(($payFail / $RequestsPerService) * 100, 1)
Write-Host "   ✅ Payment: $payOk ok, $payFail failed ($payFailRate`% failures possible)" -ForegroundColor Green

# 4) Notification Service (POST /notifications/send)
Write-Host "`n📧 Notification Service (POST /notifications/send)" -ForegroundColor Yellow
$notifOk = 0
for ($i=1; $i -le $RequestsPerService; $i++) {
  $trace   = New-TraceId
  $status  = 0
  $body = @{
    type = "EMAIL"
    recipient = "user$i@example.com"
    subject = "Test Notification #$i"
    message = "This is a test from the observability load tester."
    metadata = @{
      orderId = $orderId
      run     = $i
    }
  }
  $start   = (Get-Date).ToUniversalTime()
  $end     = $start
  $latency = 0.0
  try {
    $resp   = Invoke-JsonPost "$GatewayUrl/notifications/send" $body $trace
    $end    = (Get-Date).ToUniversalTime()
    $status = [int]$resp.StatusCode
    $latency = ($end - $start).TotalMilliseconds
    $notifOk++
    if ($i % 10 -eq 0) { Write-Host "   ✓ $i/$RequestsPerService" -ForegroundColor Green }
  } catch {
    $end    = (Get-Date).ToUniversalTime()
    $status = 500
    $latency = ($end - $start).TotalMilliseconds
    Write-Host "   ✗ $i failed" -ForegroundColor Red
  }
  Log-Request $runId $trace "notification-service" "POST" "/notifications/send" $status $end $latency
  Start-Sleep -Milliseconds $DelayMs
}
Write-Host "   ✅ Notification OK: $notifOk/$RequestsPerService" -ForegroundColor Green

# 5) Print Service (POST /invoices/generate)
Write-Host "`n🖨️  Print Service (POST /invoices/generate)" -ForegroundColor Yellow
$printOk = 0
$knownPaymentId = "a8064b5f-642c-4f14-9073-591a5d0ae711"

for ($i=1; $i -le $RequestsPerService; $i++) {
  $trace   = New-TraceId
  $status  = 0
  $body = @{
    orderId   = $orderId
    paymentId = $knownPaymentId
  }
  $start   = (Get-Date).ToUniversalTime()
  $end     = $start
  $latency = 0.0
  try {
    $resp   = Invoke-JsonPost "$GatewayUrl/invoices/generate" $body $trace
    $end    = (Get-Date).ToUniversalTime()
    $status = [int]$resp.StatusCode
    $latency = ($end - $start).TotalMilliseconds
    $printOk++
    if ($i % 10 -eq 0) { Write-Host "   ✓ $i/$RequestsPerService" -ForegroundColor Green }
  } catch {
    $end    = (Get-Date).ToUniversalTime()
    $status = 500
    $latency = ($end - $start).TotalMilliseconds
    Write-Host "   ✗ $i failed" -ForegroundColor Red
  }
  Log-Request $runId $trace "print-service" "POST" "/invoices/generate" $status $end $latency
  Start-Sleep -Milliseconds $DelayMs
}
Write-Host "   ✅ Print OK: $printOk/$RequestsPerService" -ForegroundColor Green

# Summary
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "📊 Summary" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ("Product:       {0}/{1}" -f $productOk, $RequestsPerService) -ForegroundColor Green
Write-Host ("Order:         {0}/{1}" -f $orderOk,   $RequestsPerService) -ForegroundColor Green
Write-Host ("Payment:       {0}/{1} (failures: {2}`%)" -f $payOk, $RequestsPerService, $payFailRate) -ForegroundColor Green
Write-Host ("Notification:  {0}/{1}" -f $notifOk,  $RequestsPerService) -ForegroundColor Green
Write-Host ("Print:         {0}/{1}" -f $printOk,  $RequestsPerService) -ForegroundColor Green

$total = $productOk + $orderOk + $payOk + $notifOk + $printOk + $payFail
$succ  = $productOk + $orderOk + $payOk + $notifOk + $printOk
$fail  = $payFail
Write-Host "Total Requests: $total" -ForegroundColor Cyan
Write-Host "Successful:     $succ"  -ForegroundColor Green
Write-Host "Failed:         $fail"  -ForegroundColor Yellow

Write-Host "`n⏳ Wait 60–90s, then (ML-service check endpoints):" -ForegroundColor Magenta
Write-Host "  curl http://localhost:5000/anomalies"
Write-Host "============================================================" -ForegroundColor Cyan
