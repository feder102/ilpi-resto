# 📋 Quick Reference Documentation

Esta carpeta contiene documentación de referencia rápida para consulta durante el desarrollo.

## 📖 Archivos en Esta Carpeta

### 🛠️ **COMMANDS.md** - Referencia de Comandos Útiles
Status: ✅ Complete

Lista de comandos útiles para desarrollo y testing.

**Contenido**:
- Backend commands (pytest, mypy, ruff, etc)
- Frontend commands (npm, build, lint)
- Docker commands (exec, logs, etc)
- Database commands (migrations, psql)
- Git workflows

**Uso**: Consulta rápida cuando necesites acordarte de un comando

---

## 🎯 Quick Access

### Backend Commands
```bash
make test-backend          # Run pytest
make lint-backend          # Run ruff
make typecheck-backend     # Run mypy --strict
make shell-backend         # Enter backend container
```

### Frontend Commands
```bash
make lint-frontend         # Run eslint
npm run test               # Run vitest
npm run build              # Build for production
```

### Database Commands
```bash
make db-shell              # Enter psql
make db-clean              # Reset database
```

### Development Commands
```bash
make dev                   # Start dev stack
make down                  # Stop dev stack
make logs                  # Stream logs
make help                  # Show all commands
```

---

## 🔗 Related Files

For more comprehensive guides, see:
- `../dev-experience/DEV_SETUP.md` - Complete dev guide
- `../dev-experience/QUICK_REFERENCE.txt` - Printable reference card
- `COMMANDS.md` - Detailed command reference

---

## 💡 Pro Tips

1. **Bookmark this folder**: For quick command lookup
2. **Use `make help`**: For complete command list
3. **Read COMMANDS.md**: For detailed command info
4. **Print QUICK_REFERENCE.txt**: From dev-experience folder

---

**Last Updated**: 2026-03-01
**Status**: Active Reference ✅
**For**: All developers during daily work
