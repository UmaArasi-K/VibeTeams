# ──────────────────────────────────────────────
# VibeTeams — Terraform Infrastructure
# GCP Project: promptwars-495103
# ADR-006: Terraform for all GCP infrastructure
# ──────────────────────────────────────────────

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "promptwars-495103-tfstate"
    prefix = "vibeteams"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
