# Common Commands Reference

## Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Linux/Mac
.\venv\Scripts\Activate.ps1       # Windows PowerShell
pip install -r requirements.txt
```

## Frontend Setup
```bash
cd frontend
npm install
```

## Database (Docker)
```bash
# From root
docker-compose up -d db           # Start PostgreSQL only
docker-compose up -d              # Start all services
docker-compose down               # Stop all services

# Access database
docker exec -it ilpi-spec-db-1 psql -U ilpi -d ilpi

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

## Type Checking & Linting
```bash
cd backend
mypy app --strict                 # Type safety (MUST pass with 0 errors)
ruff check .                       # Linting
ruff check . --fix                # Auto-fix

cd ../frontend
npm run lint                       # Linting
npm run lint -- --fix             # Auto-fix
```

## Testing
```bash
cd backend
pytest                             # Run all tests
pytest --cov=app --cov-report=html  # With coverage
pytest -v -k "test_auth"          # Specific tests

cd ../frontend
npm run test                       # (if configured)
```

## Database Migrations
```bash
cd backend
alembic revision --autogenerate -m "Add vacation table"
alembic upgrade head              # Apply migrations
alembic downgrade -1              # Revert last migration
alembic history                   # View migration history
alembic current                   # Current schema version
```

## Seeding Data
```bash
cd backend
python -c "from app.seed import seed; seed()"  # Create initial tenant + admin
```

## Development Servers
```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - (Optional) Watch database logs
docker-compose logs -f db
```

## Building for Production
```bash
cd backend
mypy app --strict && ruff check . && pytest

cd ../frontend
npm run build
npm run preview                   # Test production build locally

# Docker images
docker-compose build
```

## Spec-Kit Commands
```bash
# Create/update feature spec
speckit.specify

# Design the implementation
speckit.plan

# Generate dependency-ordered tasks
speckit.tasks

# Convert tasks to GitHub issues
speckit.taskstoissues

# Verify consistency across artifacts
speckit.analyze

# Execute implementation tasks
speckit.implement

# Generate feature checklist
speckit.checklist

# Update project constitution
speckit.constitution
```

## URLs When Running
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs (Swagger): http://localhost:8000/docs
- API Docs (ReDoc): http://localhost:8000/redoc
- Database: localhost:5432 (user: ilpi, password: ilpi_dev_password)

## Default Credentials (After Seed)
- Email: admin@ilpi.es
- Password: Admin123!
- Role: Admin
