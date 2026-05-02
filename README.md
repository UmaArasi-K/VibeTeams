# VibeTeams — Team Coordination Platform

A high-performance team coordination and workflow visibility platform built with a containerized architecture on Google Cloud.

## Architecture

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), Tailwind CSS, TypeScript |
| **Backend Services** | Express.js microservices on Cloud Run |
| **Database** | Cloud Firestore (real-time listeners) |
| **Events** | Cloud Pub/Sub (event-driven architecture) |
| **Integrations** | Google Calendar, Drive, Meet APIs |
| **Infrastructure** | Terraform, Cloud Build CI/CD |
| **Auth** | Firebase Authentication (Google OAuth + Email) |

## Project Structure

```
VibeTeams/
├── apps/
│   └── frontend/          # Next.js web application
├── services/
│   ├── task-service/       # Task CRUD + state machine (port 8080)
│   ├── integration-service/# Google Workspace APIs (port 8081)
│   └── notification-service/# Pub/Sub consumer + notifications (port 8082)
├── shared/
│   └── src/types.ts        # Shared TypeScript interfaces
├── infrastructure/
│   └── terraform/          # IaC for GCP resources
├── docs/
│   └── openapi.yaml        # API specification
├── firestore.rules          # Firestore security rules
├── firestore.indexes.json   # Composite indexes
├── firebase.json            # Firebase + emulator config
├── cloudbuild.yaml          # CI/CD pipeline
└── .env.example             # Environment variable template
```

## Quick Start

### Prerequisites
- Node.js 20 LTS
- Firebase CLI (`npm i -g firebase-tools`)
- Google Cloud SDK (optional, for deployment)

### Local Development (Direct)
```bash
# Start Firebase emulators
firebase emulators:start --import=./emulator-data --export-on-exit

# Start services in separate terminals
cd apps/frontend && npm run dev
cd services/task-service && npm run dev
cd services/integration-service && npm run dev
cd services/notification-service && npm run dev
```

### Local Orchestration (Docker Compose)
If you have Docker installed, you can run the entire platform with one command:
```bash
# Build and start all services
docker-compose up --build
```
This will start:
- **Frontend**: http://localhost:3000
- **Task Service**: http://localhost:8080
- **Integration Service**: http://localhost:8081
- **Notification Service**: http://localhost:8082


## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/teams/:teamId/tasks` | List tasks (filterable) |
| POST | `/api/v1/teams/:teamId/tasks` | Create task |
| PATCH | `/api/v1/teams/:teamId/tasks/:taskId` | Update task (state machine enforced) |
| DELETE | `/api/v1/teams/:teamId/tasks/:taskId` | Archive task |
| POST | `/api/v1/teams/:teamId/tasks/:taskId/comments` | Add comment |
| GET | `/api/v1/teams/:teamId/projects` | List projects |
| POST | `/api/v1/integrations/calendar/sync` | Sync with Google Calendar |
| POST | `/api/v1/integrations/meet/create` | Create Meet link |
| GET | `/api/v1/integrations/drive/files` | List Drive files |

## Task State Machine

```
Backlog → In Progress → In Review → Done
  ↕           ↕             ↕
Blocked ←←←←←←←←←←←←←←←←←←
```

## Testing

```bash
# Unit tests
cd services/task-service && npm test

# E2E tests (requires frontend running)
cd apps/frontend && npx playwright test
```

## Deployment (GCP Project: promptwars-495103)

Automated via Cloud Build on push to `main`. See `cloudbuild.yaml`.

## License

ISC
