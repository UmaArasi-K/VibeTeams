# VibeTeams Manual Deployment Script
# This script triggers a Cloud Build run manually using the local source code.
# Ensure you have the Google Cloud SDK (gcloud) installed and authenticated.

$PROJECT_ID = "promptwars-495103"

Write-Host "🚀 Triggering manual build and deployment for project: $PROJECT_ID..." -ForegroundColor Cyan

gcloud builds submit --config cloudbuild.yaml --project $PROJECT_ID .

Write-Host "✅ Build submitted. Monitor progress in the Google Cloud Console: https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID" -ForegroundColor Green
