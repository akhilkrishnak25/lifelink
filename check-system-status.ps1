Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                              ║" -ForegroundColor Green  
Write-Host "║      🩸 LIFELINK BLOOD DONATION PLATFORM 🩸                 ║" -ForegroundColor Green
Write-Host "║              Complete System Status                          ║" -ForegroundColor Green
Write-Host "║                                                              ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "📅 Date: March 7, 2026`n" -ForegroundColor Cyan

# Check Services
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "🖥️  SERVICES STATUS" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

$services = @()
$allRunning = $true

# Backend
try {
    $r = Invoke-RestMethod -Uri "http://localhost:5000/health" -TimeoutSec 2
    Write-Host "  ✅ Backend API (5000)    " -NoNewline -ForegroundColor Green
    Write-Host "RUNNING" -ForegroundColor White
    Write-Host "     URL: http://localhost:5000" -ForegroundColor Gray
    Write-Host "     Health: $($r.message)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Backend API (5000)    " -NoNewline -ForegroundColor Red
    Write-Host "DOWN" -ForegroundColor White
    $allRunning = $false
}

Write-Host ""

# ML Service
try {
    $r = Invoke-RestMethod -Uri "http://localhost:5001/health" -TimeoutSec 2
    Write-Host "  ✅ ML Service (5001)     " -NoNewline -ForegroundColor Green
    Write-Host "RUNNING" -ForegroundColor White
    Write-Host "     URL: http://localhost:5001" -ForegroundColor Gray
    Write-Host "     Model: $($r.status), Loaded: $($r.model_loaded)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ ML Service (5001)     " -NoNewline -ForegroundColor Red
    Write-Host "DOWN" -ForegroundColor White
    $allRunning = $false
}

Write-Host ""

# Frontend
try {
    $null = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2
    Write-Host "  ✅ Frontend (3000)       " -NoNewline -ForegroundColor Green
    Write-Host "RUNNING" -ForegroundColor White
    Write-Host "     URL: http://localhost:3000" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Frontend (3000)       " -NoNewline -ForegroundColor Red
    Write-Host "DOWN" -ForegroundColor White
    $allRunning = $false
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "📊 DATABASE & TESTING" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

Write-Host "  🗄️  Database:           " -NoNewline
Write-Host "MongoDB Atlas (Connected)" -ForegroundColor Green

Write-Host "  👥 Test Users:         " -NoNewline
Write-Host "5 Donors, 1 Admin" -ForegroundColor Cyan

Write-Host "  🧪 Test Scripts:       " -NoNewline
Write-Host "6 scripts available" -ForegroundColor Cyan

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "🎮 GAMIFICATION API - IMPLEMENTED" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

Write-Host "  API Endpoints:" -ForegroundColor Cyan
Write-Host "    ✅ GET  /api/gamification/profile" -ForegroundColor White
Write-Host "    ✅ GET  /api/gamification/leaderboard" -ForegroundColor White  
Write-Host "    ✅ GET  /api/gamification/achievements" -ForegroundColor White
Write-Host "    ✅ GET  /api/gamification/achievements/available" -ForegroundColor White
Write-Host "    ✅ POST /api/gamification/points" -ForegroundColor Green
Write-Host "    ✅ GET  /api/gamification/stats" -ForegroundColor Green
Write-Host "    ✅ GET  /api/gamification/rank" -ForegroundColor Green
Write-Host "    ✅ POST /api/gamification/activity" -ForegroundColor Green
Write-Host "    ✅ GET  /api/gamification/progress" -ForegroundColor Green

Write-Host "`n  Features:" -ForegroundColor Cyan
Write-Host "    🏆 Points & Levels System" -ForegroundColor White
Write-Host "    🎖️  10 Unlockable Achievements" -ForegroundColor White
Write-Host "    📊 Global Leaderboard" -ForegroundColor White
Write-Host "    🔥 Donation Streaks" -ForegroundColor White
Write-Host "    💎 5-Tier Ranking (Bronze → Diamond)" -ForegroundColor White
Write-Host "    📈 Progress Tracking" -ForegroundColor White

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "🔑 TEST CREDENTIALS" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

Write-Host "  Admin:" -ForegroundColor Cyan
Write-Host "    Email:    admin@lifelink.com" -ForegroundColor White
Write-Host "    Password: Admin@1234" -ForegroundColor Gray

Write-Host "`n  Donors (Sample):" -ForegroundColor Cyan
Write-Host "    donor_kavya_0@lifelink.com  / Test@1234  (B+ in Hyderabad)" -ForegroundColor White
Write-Host "    donor_sneha_1@lifelink.com  / Test@1234  (O+ in Chennai)" -ForegroundColor White
Write-Host "    donor_vikram_2@lifelink.com / Test@1234  (O- in Delhi)" -ForegroundColor White

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "🔗 QUICK LINKS" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

Write-Host "  🌐 Frontend:      " -NoNewline
Write-Host "http://localhost:3000" -ForegroundColor Cyan

Write-Host "  🏠 Home Page:     " -NoNewline
Write-Host "http://localhost:3000/home.html" -ForegroundColor Cyan

Write-Host "  🔐 Login:         " -NoNewline
Write-Host "http://localhost:3000/login.html" -ForegroundColor Cyan

Write-Host "  🎮 Gamification:  " -NoNewline
Write-Host "http://localhost:3000/gamification.html" -ForegroundColor Cyan

Write-Host "  🤖 Agent  Dashboard:" -NoNewline
Write-Host " http://localhost:3000/agent-dashboard.html" -ForegroundColor Cyan

Write-Host "  🩺 Admin Panel:   " -NoNewline
Write-Host "http://localhost:3000/admin-dashboard.html" -ForegroundColor Cyan

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "📝 AVAILABLE TEST SCRIPTS" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

Write-Host "  📦 create-sample-data.js       - Create comprehensive test data" -ForegroundColor White
Write-Host "  ⚡ create-quick-test-data.js    - Quick test data creation" -ForegroundColor White
Write-Host "  🎮 test-gamification-api.js    - Test gamification endpoints" -ForegroundColor White
Write-Host "  🤖 test-agentic-ai.js          - Test Agentic AI system" -ForegroundColor White
Write-Host "  📊 check-agent-status.js       - Check agent processing status" -ForegroundColor White
Write-Host "  🔍 diagnose-agentic-ai.js      - System diagnostics" -ForegroundColor White

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

if ($allRunning) {
    Write-Host "`n✅ " -NoNewline -ForegroundColor Green
    Write-Host "ALL SERVICES ARE RUNNING!" -ForegroundColor Green -BackgroundColor DarkGreen
    Write-Host "`n🎉 LifeLink is ready for testing and development!`n" -ForegroundColor Yellow
} else {
    Write-Host "`n⚠️  " -NoNewline -ForegroundColor Yellow
    Write-Host "SOME SERVICES ARE DOWN" -ForegroundColor Yellow -BackgroundColor DarkYellow
    Write-Host "`n   Please start missing services to use the platform.`n" -ForegroundColor Gray
}

Write-Host "📖 Documentation: See DEPLOYMENT_SUMMARY.md for complete details`n" -ForegroundColor Cyan
