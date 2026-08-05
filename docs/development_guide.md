# Development Guide

This guide provides step-by-step instructions for setting up the development environment and running tests for the LTI ATS system.

## 🚀 Setup Instructions

### Prerequisites

Ensure you have the following installed:
- **Node.js** (v16 or higher)
- **npm** (v8 or higher)
- **Docker** and **Docker Compose**
- **Git**

### 1. Clone the Repository

```bash
git clone git@github.com:LIDR-academy/AI4Devs-LTI-extended.git
cd AI4Devs-LTI-extended
```

### 2. Environment Configuration

Create environment files for both backend and frontend:

**Backend Environment** (`backend/.env`):
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=LTIdbUser
DB_PASSWORD=D1ymf8wyQEGthFR1E9xhCq
DB_NAME=LTIdb

# Application Configuration
PORT=3000
NODE_ENV=development

# Prisma Database URL
DATABASE_URL="postgresql://LTIdbUser:D1ymf8wyQEGthFR1E9xhCq@localhost:5432/LTIdb"

# Azure B2C service-to-service authentication (OAuth 2.0 Client Credentials)
AZURE_B2C_TOKEN_URL=
AZURE_B2C_CLIENT_ID=
AZURE_B2C_CLIENT_SECRET=
AZURE_B2C_SCOPE=
AZURE_B2C_RESOURCE=
AZURE_B2C_TOKEN_CACHE_TTL_SECONDS=600
AZURE_B2C_TOKEN_REQUEST_TIMEOUT_MS=5000

# Dev-only diagnostics endpoint gate (GET /internal/auth/token-status) — never enable in production
ENABLE_DIAGNOSTICS=
```

`AZURE_B2C_CLIENT_SECRET` must be sourced from the local secrets manager / Key Vault in every real environment — never commit a real value to `.env` or paste it into a ticket. `AZURE_B2C_SCOPE` and `AZURE_B2C_RESOURCE` are both mandatory: the application fails to start if either is missing. The exact request payload (whether `resource` is actually required alongside `scope`) is still pending validation against the ticket's Postman collection.

**Frontend Environment** (`frontend/.env`):
```env
REACT_APP_API_URL=http://localhost:3000
```

### 3. Database Setup

Two database connection strategies coexist in this project, depending on the feature being developed:

- **Dockerized local PostgreSQL** (default, described below) — used for most local development.
- **Supabase-hosted PostgreSQL** — used specifically by the `activities-management` feature (VN-4175), which was built directly against Supabase per product decision. See [Supabase connection (Activities feature)](#supabase-connection-activities-feature) below.

Only one `DATABASE_URL`/`DIRECT_URL` pair is active in `backend/.env` at a time; switch between them depending on which feature you are working on.

#### Dockerized PostgreSQL

Start the PostgreSQL database using Docker Compose:

```bash
# Start PostgreSQL container
docker-compose up -d

# Verify the database is running
docker-compose ps
```

The PostgreSQL database will be available at:
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `LTIdb`
- **Username**: `LTIdbUser`
- **Password**: `D1ymf8wyQEGthFR1E9xhCq`

#### Supabase Connection (Activities Feature)

The `activities-management` feature (`GET/POST/PUT/PATCH /api/activities*`, VN-4175) connects to a Supabase-hosted PostgreSQL database instead of the Dockerized instance above. Add the following to `backend/.env` (real credentials come from the project's Supabase dashboard — Settings → Database — never commit them; see `backend/.env.example` for the placeholder format):

```env
# DATABASE_URL: transaction-mode pooler (pgbouncer=true), used by the running application at runtime.
DATABASE_URL="postgresql://<user>:<password>@<pooler-host>:6543/postgres?pgbouncer=true"

# DIRECT_URL: session-mode pooler, used only by `prisma migrate`.
DIRECT_URL="postgresql://<user>:<password>@<pooler-host>:5432/postgres"
```

Notes:
- URL-encode any special characters in the password (e.g. `#` → `%23`).
- `DATABASE_URL` must go through the transaction-mode pooler (port `6543`, `pgbouncer=true`) — Prisma Client uses this at runtime.
- `DIRECT_URL` must go through the session-mode pooler (port `5432`) — `prisma migrate` uses this exclusively, since the transaction-mode pooler does not support the prepared-statement behavior migrations rely on.
- The backend fails fast at startup with a clear error if either variable is missing or malformed (see `backend/src/infrastructure/config/databaseConfig.ts`).
- Apply migrations with `npx prisma migrate deploy` (or `npx prisma migrate dev` when authoring a new migration).

### 4. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npx prisma migrate deploy

# (Optional) Seed the database with sample data
npx prisma db seed

# Start the development server
npm run dev
```

The backend API will be available at `http://localhost:3000`

### 5. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The frontend application will be available at `http://localhost:3001`

### 6. Cypress Testing Suite Setup

```bash
# From the frontend directory
cd frontend

# Install Cypress (if not already installed)
npm install

# Open Cypress Test Runner (Interactive)
npm run cypress:open

# Or run tests headlessly
npm run cypress:run
```

## 🧪 Testing

### Backend Testing

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Frontend Testing

```bash
cd frontend

# Run unit tests
npm test

# Run E2E tests with Cypress
npm run cypress:run

# Open Cypress Test Runner
npm run cypress:open
```

