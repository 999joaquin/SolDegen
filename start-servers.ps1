# Start SolDegen server

Write-Host "🚀 Starting SolDegen Casino..." -ForegroundColor Green
Write-Host "   - Plinko Game (with Physics) ✅" -ForegroundColor Cyan
Write-Host "   - Crash Game ✅" -ForegroundColor Cyan

# Start Python Physics Backend in background
Write-Host "`n🐍 Starting Python Physics Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd python-backend; python main.py" -WindowStyle Normal

# Wait for Python server to start
Start-Sleep -Seconds 2

# Start Next.js server
Write-Host "`n⚛️  Starting Next.js Server..." -ForegroundColor Cyan
node server.js

Write-Host "`n✅ Servers started:" -ForegroundColor Green
Write-Host "   - Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   - Physics:  http://localhost:8000" -ForegroundColor Yellow
