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

### Paso 0: Clonar el repositorio

```bash
git clone https://github.com/feder102/ilpi-resto.git
cd ilpi-resto
```

---

## 📦 BACKEND - Instalación Completa

### Paso 1: Levantar PostgreSQL (desde la raíz)

**⚠️ PRIMERO:** Asegúrate de que Docker Desktop está corriendo.

```bash
# Desde la raíz del proyecto
docker-compose up -d db
```

Verifica que PostgreSQL esté activo:
```bash
docker ps | grep ilpi-spec-db-1
```

### Paso 2: Crear entorno virtual de Python

```bash
cd backend
python -m venv venv
```

### Paso 3: Activar el entorno virtual

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

Deberías ver `(venv)` al inicio de tu terminal.

### Paso 4: Instalar dependencias Python

```bash
# Asegúrate de estar en el directorio backend/ con venv activado
pip install -r requirements.txt
```

### Paso 5: Configurar variables de entorno

Copia el archivo `.env.example` a `.env`:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# Linux/Mac
cp .env.example .env
```

El `.env` ya contiene los valores correctos para desarrollo local. **No hagas cambios** a menos que necesites puertos distintos.

### Paso 6: Ejecutar migraciones de base de datos

```bash
# Asegúrate de estar en backend/ con venv activado
alembic upgrade head
```

### Paso 7: Cargar datos iniciales (seed)

```bash
# Aún en backend/ con venv activado
python -c "from app.seed import seed; seed()"
```

Esto crea:
- Tenant "ILPI"
- Usuario admin con email `admin@ilpi.es` y password `Admin123!`

### Paso 8: Levantar el servidor FastAPI

```bash
# Aún en backend/ con venv activado
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

✅ El backend está listo en **http://localhost:8000**
- Documentación: **http://localhost:8000/docs**
- ReDoc: **http://localhost:8000/redoc**

---

## 🎨 FRONTEND - Instalación Completa

### Paso 1: Abrir una **NUEVA TERMINAL**

No cierres la del backend, necesita estar corriendo.

### Paso 2: Navegar a la carpeta frontend

```bash
cd frontend
```

### Paso 3: Instalar dependencias Node

```bash
npm install
```

### Paso 4: Configurar variables de entorno

Copia el archivo `.env.example` a `.env`:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# Linux/Mac
cp .env.example .env
```

El `.env` ya apunta al backend en **http://localhost:8000/api/v1**. No hagas cambios.

### Paso 5: Levantar el servidor de desarrollo

```bash
# Aún en frontend/
npm run dev
```

✅ El frontend está listo en **http://localhost:5173**

---

## ▶️ Verificar que todo funciona

1. Abre **http://localhost:5173** en tu navegador
2. Deberías ver la página de login
3. Usa las credenciales por defecto:
   - **Email:** `admin@ilpi.es`
   - **Password:** `Admin123!`
4. Si el login funciona, ¡todo está correctamente conectado! ✅

---

## 🐳 Alternativa: Ejecutar con Docker Compose

Si prefieres no instalar Python ni Node.js localmente:

```bash
# Desde la raíz del proyecto
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

Los servicios estarán disponibles en los mismos puertos (Backend: 8000, Frontend: 5173)

## 🌐 URLs de Acceso

Una vez levantado el proyecto:

| Servicio | URL | Propósito |
|----------|-----|----------|
| **Frontend** | http://localhost:5173 | Interfaz web de usuario |
| **Backend API** | http://localhost:8000 | API REST |
| **Swagger (API Docs)** | http://localhost:8000/docs | Documentación interactiva |
| **ReDoc (API Docs)** | http://localhost:8000/redoc | Documentación en formato ReDoc |
| **pgAdmin** | http://localhost:5050 | Interfaz gráfica de PostgreSQL |
| **MailHog (Email)** | http://localhost:8025 | Captura y visualización de emails |

---

## 📧 Servicios de Desarrollo

### MailHog - Captura de Emails

Para desarrollo sin SMTP configurado, el proyecto incluye **MailHog**, un servidor SMTP fake que captura todos los emails enviados por la aplicación.

#### Cómo usar MailHog

**Abre:** http://localhost:8025 en tu navegador

Aquí podrás:
1. Ver todos los emails capturados
2. Leer el contenido (HTML o texto plano)
3. Ver los enlaces de recuperación de contraseña
4. Copiar tokens de reset

#### Flujo de Prueba - Recuperación de Contraseña

1. **Solicita un reset:**
   - Haz clic en "¿Olvidaste tu contraseña?" en el login
   - Ingresa tu email registrado
   - Recibirás un mensaje de confirmación

2. **Captura el email:**
   - Abre http://localhost:8025
   - Deberías ver el email de recuperación
   - Haz clic para abrir y ver el contenido completo

3. **Obtén el enlace:**
   - En el email HTML encontrarás el botón "Recuperar mi contraseña"
   - O copia la URL completa del enlace
   - La URL tendrá la forma: `http://localhost/password-reset?token=xyz123...`

4. **Cambia tu contraseña:**
   - Pega la URL en tu navegador
   - Ingresa tu nueva contraseña (debe cumplir: 8+ chars, mayúscula, minúscula, número, carácter especial)
   - Haz clic en "Cambiar contraseña"

5. **Inicia sesión:**
   - Regresa a http://localhost/login
   - Usa tu email y la nueva contraseña

#### Configuración de MailHog

MailHog está pre-configurado en `docker-compose.dev.yml`:

```yaml
mailhog:
  image: mailhog/mailhog:latest
  container_name: ilpi-mailhog-dev
  ports:
    - "1025:1025"  # SMTP port (para el backend)
    - "8025:8025"  # Web UI (para visualizar emails)
```

**Variables de entorno del backend** (en `.env`):
```env
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@ilpi.local
```

#### Alternativa: Ver enlaces en los logs

Si prefieres no usar MailHog, también puedes ver los enlaces de reset directamente en los logs del backend:

```bash
docker-compose logs -f ilpi-backend-dev | grep "Reset Link"
```

---

### pgAdmin - Gestión de Base de Datos

**Abre:** http://localhost:5050

- **Usuario:** admin@ilpi.es
- **Password:** admin
- **Servidor preconfigurado:** ILPI PostgreSQL Dev

Permite:
- Ver todas las tablas y datos
- Ejecutar queries SQL
- Inspeccionar estructura de la BD
- Debugging de datos

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

### El frontend no se conecta al backend (Error en login: "Invalid credentials")

**Problema:** Error de CORS, conexión rechazada, o el frontend intenta conectar al puerto incorrecto

**Causa más común:**
- `frontend/.env` apunta a un puerto incorrecto del backend (ej: 8001 en lugar de 8000)
- `backend/.env` tiene CORS_ORIGINS configurado para el puerto incorrecto del frontend (ej: 5174 en lugar de 5173)

**Solución:**
1. **Verifica `backend/.env`:**
   ```env
   CORS_ORIGINS=http://localhost:5173  # ← Debe ser 5173, NO 5174
   ```

2. **Verifica `frontend/.env`:**
   ```env
   VITE_API_URL=http://localhost:8000/api/v1        # ← Debe ser 8000, NO 8001
   VITE_API_BASE_URL=http://localhost:8000/api/v1   # ← Debe ser 8000, NO 8001
   ```

3. **Reinicia ambos servidores:**
   - Detén el backend (Ctrl+C en su terminal)
   - Detén el frontend (Ctrl+C en su terminal)
   - Vuelve a levantarlos en orden:
     - Backend: `cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
     - Frontend: `cd frontend && npm run dev`

4. **Vacía la caché del navegador:**
   - F12 → Application/Storage → Clear all

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
