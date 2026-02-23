# Quickstart: Kitchen Staff Management MVP

**Branch**: `001-kitchen-staff-mgmt` | **Date**: 2026-02-22

## Prerequisites

- Python 3.12+
- Node.js 20 LTS + npm
- PostgreSQL 16 (or Docker)
- Git

## 1. Clone and Setup

```bash
git clone <repo-url>
cd ilpi-spec
git checkout 001-kitchen-staff-mgmt
```

## 2. Start PostgreSQL (Docker)

```bash
docker-compose up -d db
```

Or use an existing PostgreSQL instance and update `.env` accordingly.

## 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate    # Linux/Mac
# .venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment config
cp .env.example .env
# Edit .env with your DATABASE_URL, SECRET_KEY, etc.

# Run database migrations
alembic upgrade head

# Seed initial data (tenant + admin user)
python -m app.seed

# Start the API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API is available at `http://localhost:8000`.
Swagger docs at `http://localhost:8000/docs`.

## 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment config
cp .env.example .env
# Set VITE_API_URL=http://localhost:8000/api/v1

# Start development server
npm run dev
```

The frontend is available at `http://localhost:5173`.

## 5. Docker Compose (Full Stack)

```bash
# From repository root
docker-compose up --build
```

Services:
- `db`: PostgreSQL on port 5432
- `backend`: FastAPI on port 8000
- `frontend`: Vite dev server on port 5173

## 6. Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ilpi.es | Admin123! |

Change the admin password immediately after first login.

## 7. Verify Installation

1. Open `http://localhost:5173` in your browser.
2. Log in with admin credentials.
3. Navigate to "Personal" — you should see one seed employee.
4. Create a new employee to verify full CRUD.
5. Navigate to "Vacaciones" — submit a vacation request.
6. Navigate to "Control Horario" — perform a simulated clock-in.

## 8. Running Tests

```bash
# Backend tests
cd backend
pytest -v

# Frontend tests
cd frontend
npm run test
```

## Environment Variables

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql+asyncpg://user:pass@localhost:5432/ilpi |
| SECRET_KEY | JWT signing secret (min 32 chars) | generate with: openssl rand -hex 32 |
| ACCESS_TOKEN_EXPIRE_MINUTES | JWT access token TTL | 30 |
| REFRESH_TOKEN_EXPIRE_DAYS | Refresh token TTL | 7 |
| CORS_ORIGINS | Allowed frontend origins | http://localhost:5173 |
| LOG_LEVEL | Logging level | INFO |

### Frontend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| VITE_API_URL | Backend API base URL | http://localhost:8000/api/v1 |
