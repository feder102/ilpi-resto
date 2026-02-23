# ILPI - Sistema de Gestión de Personal de Cocina

Sistema completo para gestión de empleados, turnos, asistencia y vacaciones para restaurantes.

## 🚀 Stack Tecnológico

### Backend
- **Python 3.12+**
- **FastAPI** - Framework web moderno y rápido
- **SQLModel** - ORM basado en SQLAlchemy y Pydantic
- **PostgreSQL 16** - Base de datos
- **Alembic** - Migraciones de base de datos
- **JWT** - Autenticación con tokens
- **Bcrypt** - Hash de passwords

### Frontend
- **React 19** - Library UI
- **TypeScript 5.8+** - Tipado estático
- **Vite 6** - Build tool
- **React Router v7** - Navegación
- **Recharts** - Gráficos
- **React Big Calendar** - Calendario de turnos
- **Lucide React** - Iconos
- **Axios** - Cliente HTTP

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Python 3.12+** - [Descargar](https://www.python.org/downloads/)
- **Node.js 18+** - [Descargar](https://nodejs.org/)
- **Docker Desktop** - [Descargar](https://www.docker.com/products/docker-desktop/) (para PostgreSQL)
- **Git** - [Descargar](https://git-scm.com/downloads)

## 🛠️ Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/feder102/ilpi-resto.git
cd ilpi-resto
```

### 2. Configurar Backend

#### 2.1 Crear entorno virtual de Python

```bash
cd backend
python -m venv venv
```

#### 2.2 Activar el entorno virtual

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

**Windows (CMD):**
```cmd
venv\Scripts\activate.bat
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

#### 2.3 Instalar dependencias

```bash
pip install -r requirements.txt
```

#### 2.4 Configurar variables de entorno

Copia el archivo de ejemplo y ajusta si es necesario:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# Linux/Mac
cp .env.example .env
```

El archivo `.env` contiene:
```env
DATABASE_URL=postgresql://ilpi:ilpi_dev_password@localhost:5432/ilpi
SECRET_KEY=change-this-to-a-random-string-at-least-32-characters-long
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:5173
LOG_LEVEL=INFO
```

### 3. Levantar PostgreSQL con Docker

Desde la raíz del proyecto:

```bash
cd ..  # Si estás en backend, vuelve a la raíz
docker-compose up -d db
```

Verifica que PostgreSQL esté corriendo:
```bash
docker ps
```

Deberías ver un contenedor `ilpi-spec-db-1` corriendo en el puerto 5432.

### 4. Ejecutar Migraciones y Seed

Vuelve al directorio backend (y asegúrate de que el entorno virtual esté activado):

```bash
cd backend

# Aplicar migraciones
alembic upgrade head

# Cargar datos iniciales (crea tenant "ILPI" y usuario admin)
python -c "from app.seed import seed; seed()"
```

### 5. Configurar Frontend

Abre una **nueva terminal** y:

```bash
cd frontend

# Instalar dependencias
npm install
```

## ▶️ Ejecutar el Proyecto

### Opción 1: Desarrollo Manual (Recomendado para desarrollo)

#### Terminal 1 - Backend:
```bash
cd backend
# Activar entorno virtual (si no está activado)
.\venv\Scripts\Activate.ps1  # Windows
# source venv/bin/activate    # Linux/Mac

# Levantar servidor FastAPI
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

### Opción 2: Docker Compose (Todo el stack)

Desde la raíz del proyecto:

```bash
docker-compose up
```

Para ejecutar en segundo plano:
```bash
docker-compose up -d
```

Para detener:
```bash
docker-compose down
```

## 🌐 URLs de Acceso

Una vez levantado el proyecto:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **Documentación API (Swagger):** http://localhost:8000/docs
- **Documentación API (ReDoc):** http://localhost:8000/redoc

## 🔑 Credenciales por Defecto

Después de ejecutar el seed, puedes hacer login con:

- **Email:** `admin@ilpi.es`
- **Password:** `Admin123!`

## 📁 Estructura del Proyecto

```
ilpi-resto/
├── backend/
│   ├── alembic/              # Migraciones de base de datos
│   ├── app/
│   │   ├── common/           # Utilidades compartidas
│   │   ├── models/           # Modelos SQLModel
│   │   ├── routers/          # Endpoints de la API
│   │   ├── schemas/          # Schemas Pydantic
│   │   ├── services/         # Lógica de negocio
│   │   ├── config.py         # Configuración
│   │   ├── database.py       # Setup de base de datos
│   │   ├── dependencies.py   # Dependencias FastAPI
│   │   ├── main.py           # Aplicación FastAPI
│   │   └── seed.py           # Datos iniciales
│   ├── tests/                # Tests unitarios e integración
│   ├── .env.example          # Variables de entorno ejemplo
│   ├── alembic.ini           # Configuración Alembic
│   ├── Dockerfile            # Imagen Docker backend
│   ├── pyproject.toml        # Configuración proyecto Python
│   └── requirements.txt      # Dependencias Python
├── frontend/
│   ├── public/               # Archivos estáticos
│   ├── src/
│   │   ├── components/       # Componentes reutilizables
│   │   ├── context/          # Context API (AuthContext)
│   │   ├── hooks/            # Custom hooks
│   │   ├── services/         # Servicios API
│   │   ├── types/            # Tipos TypeScript
│   │   ├── views/            # Vistas/Páginas
│   │   ├── App.tsx           # Componente principal
│   │   └── main.tsx          # Punto de entrada
│   ├── Dockerfile            # Imagen Docker frontend
│   ├── package.json          # Dependencias Node
│   ├── tsconfig.json         # Configuración TypeScript
│   └── vite.config.ts        # Configuración Vite
├── specs/                    # Documentación y especificaciones
├── docker-compose.yml        # Orquestación Docker
└── README.md                 # Este archivo
```

## 🧪 Ejecutar Tests

### Backend

```bash
cd backend
# Activar entorno virtual
pytest
```

Para tests con cobertura:
```bash
pytest --cov=app --cov-report=html
```

### Frontend

```bash
cd frontend
npm run test        # (si hay tests configurados)
npm run lint        # Linter
```

## 🔧 Scripts Útiles

### Backend

```bash
# Crear nueva migración
alembic revision --autogenerate -m "descripción del cambio"

# Aplicar migraciones
alembic upgrade head

# Revertir última migración
alembic downgrade -1

# Ver historial de migraciones
alembic history

# Formatear código
ruff check . --fix
```

### Frontend

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Linter
npm run lint
```

## 🐳 Docker

### Reconstruir imágenes

```bash
docker-compose build
```

### Ver logs

```bash
# Todos los servicios
docker-compose logs -f

# Solo backend
docker-compose logs -f backend

# Solo frontend
docker-compose logs -f frontend

# Solo base de datos
docker-compose logs -f db
```

### Acceder a la base de datos

```bash
docker exec -it ilpi-spec-db-1 psql -U ilpi -d ilpi
```

## 🔍 Troubleshooting

### Error: PostgreSQL no se conecta

**Problema:** `connection to server at "localhost", port 5432 failed`

**Solución:**
1. Verifica que Docker Desktop esté corriendo
2. Levanta PostgreSQL: `docker-compose up -d db`
3. Verifica el estado: `docker ps`

### Error: Module 'bcrypt' has no attribute '__about__'

**Problema:** Warning al ejecutar seed sobre bcrypt

**Solución:** 
```bash
pip install bcrypt==4.1.1
```
_(Es solo un warning, el seed funciona correctamente)_

### Error: email-validator no instalado

**Problema:** `ModuleNotFoundError: No module named 'email_validator'`

**Solución:**
```bash
pip install email-validator
```

### Puerto 8000 o 5173 ya en uso

**Problema:** `Address already in use`

**Solución:**
```bash
# Windows - Ver qué proceso usa el puerto
netstat -ano | findstr :8000
netstat -ano | findstr :5173

# Matar proceso por PID
taskkill /PID <PID> /F

# Linux/Mac - Ver y matar proceso
lsof -ti:8000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### El frontend no se conecta al backend

**Problema:** Error de CORS o conexión rechazada

**Solución:**
1. Verifica que el backend esté corriendo en http://localhost:8000
2. Verifica la configuración en `frontend/src/services/apiClient.ts`
3. Asegúrate de que CORS_ORIGINS en `.env` incluya `http://localhost:5173`

## 🚀 Despliegue

### Preparación para Producción

1. **Backend:**
   - Cambia `SECRET_KEY` por una clave segura aleatoria (mínimo 32 caracteres)
   - Configura `DATABASE_URL` con tu base de datos de producción
   - Ajusta `CORS_ORIGINS` con tu dominio de frontend
   - Configura `LOG_LEVEL=WARNING` o `ERROR`

2. **Frontend:**
   - Actualiza la URL del API en los archivos de configuración
   - Ejecuta `npm run build` para generar el build de producción

3. **Base de datos:**
   - Ejecuta las migraciones: `alembic upgrade head`
   - Ejecuta el seed solo una vez: `python -c "from app.seed import seed; seed()"`

## 📚 Documentación

- **API Endpoints:** Ver `/docs` cuando el backend esté corriendo
- **Especificaciones:** Ver carpeta `specs/001-kitchen-staff-mgmt/`
- **Contratos API:** `specs/001-kitchen-staff-mgmt/contracts/`

## 🤝 Contribuir

1. Crea una rama desde `main`: `git checkout -b feature/nueva-funcionalidad`
2. Haz tus cambios y commit: `git commit -m "feat: descripción"`
3. Push: `git push origin feature/nueva-funcionalidad`
4. Crea un Pull Request en GitHub

## 📝 Convenciones de Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nueva funcionalidad
- `fix:` Corrección de bugs
- `docs:` Cambios en documentación
- `style:` Formateo, punto y coma faltantes, etc.
- `refactor:` Refactorización de código
- `test:` Agregar o modificar tests
- `chore:` Mantenimiento, dependencias, etc.

## 📄 Licencia

Este proyecto es privado y de uso interno.

## 👥 Equipo

Desarrollado para ILPI Restaurante.

---

**¿Necesitas ayuda?** Revisa la sección de Troubleshooting o contacta al equipo de desarrollo.
