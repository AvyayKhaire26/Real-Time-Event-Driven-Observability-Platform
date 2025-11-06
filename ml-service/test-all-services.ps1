# ================== Complete Load Test (Fixed) ==================
param(
  [string]$GatewayUrl = "http://localhost:3000",
  [int]$RequestsPerService = 100,
  [int]$DelayMs = 100
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🚀 Starting Complete System Load Test (Fixed)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Confirmed IDs
$productId = "f62829a1-59cc-44a4-b9bf-cd84200aa310"
$orderId   = "7e8658c0-89e8-4fe8-9291-722cbc582c26"

# Helpers
function Invoke-JsonPost {
  param($Url, $BodyObject)
  $json = $BodyObject | ConvertTo-Json -Depth 6
  return Invoke-WebRequest -Uri $Url -Method POST -ContentType "application/json" -Body $json -UseBasicParsing -TimeoutSec 30
}

# 1) Product Service
Write-Host "`n📦 Product Service (GET /products)" -ForegroundColor Yellow
$productOk = 0
for ($i=1; $i -le $RequestsPerService; $i++) {
  try {
    Invoke-WebRequest -Uri "$GatewayUrl/products" -UseBasicParsing -TimeoutSec 30 | Out-Null
    $productOk++
    if ($i % 10 -eq 0) { Write-Host "   ✓ $i/$RequestsPerService" -ForegroundColor Green }
  } catch { Write-Host "   ✗ $i failed" -ForegroundColor Red }
  Start-Sleep -Milliseconds $DelayMs
}
Write-Host "   ✅ Product OK: $productOk/$RequestsPerService" -ForegroundColor Green

# 2) Order Service
# Use GET /orders as you confirmed it works manually through gateway
Write-Host "`n📋 Order Service (GET /orders)" -ForegroundColor Yellow
$orderOk = 0
for ($i=1; $i -le $RequestsPerService; $i++) {
  try {
    Invoke-WebRequest -Uri "$GatewayUrl/orders" -UseBasicParsing -TimeoutSec 30 | Out-Null
    $orderOk++
    if ($i % 10 -eq 0) { Write-Host "   ✓ $i/$RequestsPerService" -ForegroundColor Green }
  } catch { Write-Host "   ✗ $i failed" -ForegroundColor Red }
  Start-Sleep -Milliseconds $DelayMs
}
Write-Host "   ✅ Order OK: $orderOk/$RequestsPerService" -ForegroundColor Green

# 3) Payment Service
Write-Host "`n💳 Payment Service (POST /payments/process) with real orderId" -ForegroundColor Yellow
$payOk = 0; $payFail = 0
for ($i=1; $i -le $RequestsPerService; $i++) {
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
  try {
    Invoke-JsonPost "$GatewayUrl/payments/process" $body | Out-Null
    $payOk++
    if ($i % 10 -eq 0) { Write-Host "   ✓ $i/$RequestsPerService" -ForegroundColor Green }
  } catch { $payFail++ }
  Start-Sleep -Milliseconds $DelayMs
}
$payFailRate = [math]::Round(($payFail / $RequestsPerService) * 100, 1)
Write-Host "   ✅ Payment: $payOk ok, $payFail failed ($payFailRate`% failures expected)" -ForegroundColor Green

# 4) Notification Service
Write-Host "`n📧 Notification Service (POST /notifications/send)" -ForegroundColor Yellow
$notifOk = 0
for ($i=1; $i -le $RequestsPerService; $i++) {
  $body = @{
    type = "EMAIL"
    recipient = "user$i@example.com"
    subject = "Test Notification #$i"
    message = "This is a test from the observability load tester."
  }
  try {
    Invoke-JsonPost "$GatewayUrl/notifications/send" $body | Out-Null
    $notifOk++
    if ($i % 10 -eq 0) { Write-Host "   ✓ $i/$RequestsPerService" -ForegroundColor Green }
  } catch { Write-Host "   ✗ $i failed" -ForegroundColor Red }
  Start-Sleep -Milliseconds $DelayMs
}
Write-Host "   ✅ Notification OK: $notifOk/$RequestsPerService" -ForegroundColor Green

# 5) Print Service
Write-Host "`n🖨️  Print Service (POST /invoices/generate)" -ForegroundColor Yellow
$printOk = 0
for ($i=1; $i -le $RequestsPerService; $i++) {
  $invoice = "INV-$(Get-Date -Format 'yyyyMMdd')-$i"
  $body = @{
    orderId = $orderId
    invoiceNumber = $invoice
    items = @(@{ name = "Product"; quantity = 2; price = 1299.99 })
    totalAmount = 2599.98
  }
  try {
    Invoke-JsonPost "$GatewayUrl/invoices/generate" $body | Out-Null
    $printOk++
    if ($i % 10 -eq 0) { Write-Host "   ✓ $i/$RequestsPerService" -ForegroundColor Green }
  } catch { Write-Host "   ✗ $i failed" -ForegroundColor Red }
  Start-Sleep -Milliseconds $DelayMs
}
Write-Host "   ✅ Print OK: $printOk/$RequestsPerService" -ForegroundColor Green

# Summary
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "📊 Summary" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ("Product:      {0}/{1}" -f $productOk, $RequestsPerService) -ForegroundColor Green
Write-Host ("Order:        {0}/{1}" -f $orderOk,   $RequestsPerService) -ForegroundColor Green
Write-Host ("Payment:      {0}/{1} (failures: {2}`%)" -f $payOk, $RequestsPerService, $payFailRate) -ForegroundColor Green
Write-Host ("Notification: {0}/{1}" -f $notifOk,  $RequestsPerService) -ForegroundColor Green
Write-Host ("Print:        {0}/{1}" -f $printOk,   $RequestsPerService) -ForegroundColor Green

$total = $productOk + $orderOk + $payOk + $notifOk + $printOk + $payFail
$succ  = $productOk + $orderOk + $payOk + $notifOk + $printOk
$fail  = $payFail
Write-Host "Total Requests: $total" -ForegroundColor Cyan
Write-Host "Successful:     $succ"  -ForegroundColor Green
Write-Host "Failed:         $fail"  -ForegroundColor Yellow

Write-Host "`n⏳ Wait 60–90s, then:" -ForegroundColor Magenta
Write-Host "  curl http://localhost:5000/api/status"
Write-Host "  curl http://localhost:5000/api/detect"
Write-Host "============================================================" -ForegroundColor Cyan
