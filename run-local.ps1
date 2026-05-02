# VibeTeams Local Development Runner
# This script helps you start all services locally.
# Run each command in a separate terminal window.

Write-Host "🏠 VibeTeams Local Development" -ForegroundColor Magenta
Write-Host "--------------------------------"

Write-Host "1. Start Frontend:" -ForegroundColor Yellow
Write-Host "   cd apps/frontend; npm run dev"

Write-Host "`n2. Start Task Service:" -ForegroundColor Yellow
Write-Host "   cd services/task-service; npm run dev"

Write-Host "`n3. Start Integration Service:" -ForegroundColor Yellow
Write-Host "   cd services/integration-service; npm run dev"

Write-Host "`n4. Start Notification Service:" -ForegroundColor Yellow
Write-Host "   cd services/notification-service; npm run dev"

Write-Host "`n💡 Tip: Make sure you have your .env.local file configured in apps/frontend/" -ForegroundColor Gray
