output "task_service_url" {
  description = "URL of the Task Service on Cloud Run"
  value       = google_cloud_run_v2_service.task_service.uri
}

output "integration_service_url" {
  description = "URL of the Integration Service on Cloud Run"
  value       = google_cloud_run_v2_service.integration_service.uri
}

output "notification_service_url" {
  description = "URL of the Notification Service on Cloud Run"
  value       = google_cloud_run_v2_service.notification_service.uri
}

output "task_service_account" {
  description = "Service account email for the Task Service"
  value       = google_service_account.task_service.email
}

output "integration_service_account" {
  description = "Service account email for the Integration Service"
  value       = google_service_account.integration_service.email
}

output "notification_service_account" {
  description = "Service account email for the Notification Service"
  value       = google_service_account.notification_service.email
}
