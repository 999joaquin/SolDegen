# Test Plinko Physics Fix

Write-Host "`n🎯 Testing Plinko Physics Fixes..." -ForegroundColor Cyan
Write-Host "   1. Bola turun HANYA 1x (tidak double)" -ForegroundColor Yellow
Write-Host "   2. WIN/LOSS muncul SETELAH bola masuk bin" -ForegroundColor Yellow
Write-Host "   3. Board width sync (800px)" -ForegroundColor Yellow

Write-Host "`n🚀 Starting servers..." -ForegroundColor Green

# Start servers
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '🐍 Python Physics Backend' -ForegroundColor Yellow; cd python-backend; python main.py" -WindowStyle Normal

Write-Host "⏳ Waiting for Python backend to start..." -ForegroundColor Gray
Start-Sleep -Seconds 3

Write-Host "`n⚛️  Starting Node.js server..." -ForegroundColor Cyan
node server.js
