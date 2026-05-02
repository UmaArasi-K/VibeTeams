# ──────────────────────────────────────────────
# Enable Required GCP APIs
# ──────────────────────────────────────────────
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "firestore.googleapis.com",
    "pubsub.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudbuild.googleapis.com",
    "iam.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "firebase.googleapis.com",
    "calendar-json.googleapis.com",
    "drive.googleapis.com",
  ])

  project = var.project_id
  service = each.value

  disable_on_destroy = false
}

# ──────────────────────────────────────────────
# IAM Service Accounts (Least-Privilege — Section 1.2)
# ──────────────────────────────────────────────
resource "google_service_account" "task_service" {
  account_id   = "task-service-sa"
  display_name = "Task Service"
  project      = var.project_id
}

resource "google_service_account" "integration_service" {
  account_id   = "integration-service-sa"
  display_name = "Integration Service"
  project      = var.project_id
}

resource "google_service_account" "notification_service" {
  account_id   = "notification-service-sa"
  display_name = "Notification Service"
  project      = var.project_id
}

# Task Service — Firestore + Pub/Sub publish
resource "google_project_iam_member" "task_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.task_service.email}"
}

resource "google_project_iam_member" "task_pubsub" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.task_service.email}"
}

# Integration Service — Firestore + Pub/Sub + Secret Manager
resource "google_project_iam_member" "integration_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.integration_service.email}"
}

resource "google_project_iam_member" "integration_pubsub" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.integration_service.email}"
}

resource "google_project_iam_member" "integration_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.integration_service.email}"
}

# Notification Service — Firestore + Pub/Sub subscribe
resource "google_project_iam_member" "notification_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.notification_service.email}"
}

resource "google_project_iam_member" "notification_pubsub" {
  project = var.project_id
  role    = "roles/pubsub.subscriber"
  member  = "serviceAccount:${google_service_account.notification_service.email}"
}

# ──────────────────────────────────────────────
# Cloud Pub/Sub Topics — Event Catalog (Section 7)
# ──────────────────────────────────────────────
resource "google_pubsub_topic" "task_state_changed" {
  name    = "task.state.changed"
  project = var.project_id
}

resource "google_pubsub_topic" "task_assigned" {
  name    = "task.assigned"
  project = var.project_id
}

resource "google_pubsub_topic" "task_comment_added" {
  name    = "task.comment.added"
  project = var.project_id
}

resource "google_pubsub_topic" "integration_calendar_sync" {
  name    = "integration.calendar.sync"
  project = var.project_id
}

resource "google_pubsub_topic" "team_member_added" {
  name    = "team.member.added"
  project = var.project_id
}

# Subscriptions — push to notification service
resource "google_pubsub_subscription" "notify_state_changed" {
  name    = "notify-task-state-changed"
  topic   = google_pubsub_topic.task_state_changed.id
  project = var.project_id

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.notification_service.uri}/api/v1/notifications/push"
    attributes = {
      topic = "task.state.changed"
    }
  }

  ack_deadline_seconds = 20
}

resource "google_pubsub_subscription" "notify_task_assigned" {
  name    = "notify-task-assigned"
  topic   = google_pubsub_topic.task_assigned.id
  project = var.project_id

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.notification_service.uri}/api/v1/notifications/push"
    attributes = {
      topic = "task.assigned"
    }
  }

  ack_deadline_seconds = 20
}

resource "google_pubsub_subscription" "notify_comment_added" {
  name    = "notify-comment-added"
  topic   = google_pubsub_topic.task_comment_added.id
  project = var.project_id

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.notification_service.uri}/api/v1/notifications/push"
    attributes = {
      topic = "task.comment.added"
    }
  }

  ack_deadline_seconds = 20
}

resource "google_pubsub_subscription" "notify_member_added" {
  name    = "notify-member-added"
  topic   = google_pubsub_topic.team_member_added.id
  project = var.project_id

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.notification_service.uri}/api/v1/notifications/push"
    attributes = {
      topic = "team.member.added"
    }
  }

  ack_deadline_seconds = 20
}

# ──────────────────────────────────────────────
# Cloud Run Services — ADR-001
# ──────────────────────────────────────────────
resource "google_cloud_run_v2_service" "task_service" {
  name     = "task-service"
  location = var.region
  project  = var.project_id

  template {
    service_account = google_service_account.task_service.email

    containers {
      image = "gcr.io/${var.project_id}/task-service:latest"

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "NODE_ENV"
        value = var.environment
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }
  }

  depends_on = [google_project_service.apis]
}

resource "google_cloud_run_v2_service" "integration_service" {
  name     = "integration-service"
  location = var.region
  project  = var.project_id

  template {
    service_account = google_service_account.integration_service.email

    containers {
      image = "gcr.io/${var.project_id}/integration-service:latest"

      ports {
        container_port = 8081
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "NODE_ENV"
        value = var.environment
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }
  }

  depends_on = [google_project_service.apis]
}

resource "google_cloud_run_v2_service" "notification_service" {
  name     = "notification-service"
  location = var.region
  project  = var.project_id

  template {
    service_account = google_service_account.notification_service.email

    containers {
      image = "gcr.io/${var.project_id}/notification-service:latest"

      ports {
        container_port = 8082
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "256Mi"
        }
      }

      env {
        name  = "NODE_ENV"
        value = var.environment
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }
  }

  depends_on = [google_project_service.apis]
}

# Allow unauthenticated access to Cloud Run (public API)
resource "google_cloud_run_v2_service_iam_member" "task_public" {
  name     = google_cloud_run_v2_service.task_service.name
  location = var.region
  project  = var.project_id
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "integration_public" {
  name     = google_cloud_run_v2_service.integration_service.name
  location = var.region
  project  = var.project_id
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ──────────────────────────────────────────────
# Secret Manager — store OAuth credentials
# ──────────────────────────────────────────────
resource "google_secret_manager_secret" "google_client_id" {
  secret_id = "google-oauth-client-id"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "google_client_secret" {
  secret_id = "google-oauth-client-secret"
  project   = var.project_id

  replication {
    auto {}
  }
}
