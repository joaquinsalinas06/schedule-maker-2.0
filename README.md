# Schedule Maker 2.0

**La herramienta más avanzada para generar horarios universitarios optimizados** 🎓

Schedule Maker 2.0 es una aplicación web completa diseñada específicamente para estudiantes universitarios, que permite crear, colaborar y gestionar horarios académicos de forma inteligente y eficiente.

![Tech Stack](https://img.shields.io/badge/Frontend-Next.js_15-blue)
![Tech Stack](https://img.shields.io/badge/Backend-FastAPI-green)
![Tech Stack](https://img.shields.io/badge/Database-PostgreSQL-blue)
![Tech Stack](https://img.shields.io/badge/TypeScript-enabled-blue)

## ✨ Características Principales

### 🔍 **Búsqueda Inteligente de Cursos**
- Búsqueda en tiempo real con autocompletado
- Filtros por universidad, departamento y profesor
- Base de datos completa de cursos de UTEC (más universidades próximamente)
- Información detallada de profesores y secciones

### 📅 **Generación Automática de Horarios**
- Algoritmo inteligente para generar combinaciones óptimas
- Detección automática de conflictos de horarios
- Múltiples opciones de horarios generados
- Visualización clara y intuitiva de los horarios

### 👥 **Sistema de Colaboración Avanzado**
- **Sesiones Colaborativas**: Trabaja en tiempo real con compañeros
- **Compartir Horarios**: Comparte tus horarios con códigos únicos
- **Comparación de Horarios**: Compara horarios entre amigos
- **Cursos Compartidos vs Individuales**: Organiza materias comunes y personales

### 🫂 **Sistema de Amigos**
- Buscar y agregar compañeros de universidad
- Sistema de solicitudes de amistad
- Perfiles de usuario con información académica
- Visualización de horarios de amigos para coordinación

### 💾 **Gestión Personal de Horarios**
- Guardar horarios favoritos
- Múltiples versiones de horarios por semestre
- Historial de horarios creados
- Exportación y compartición fácil

### 🔐 **Autenticación y Perfiles**
- Sistema de registro seguro por universidad
- Perfiles personalizables con foto
- Verificación por correo institucional
- Gestión de preferencias personales

## 🏗️ Arquitectura Técnica

### Frontend (Next.js 15 + TypeScript)
```
frontend/
├── src/
│   ├── app/                    # App Router de Next.js
│   │   ├── dashboard/          # Panel principal
│   │   │   ├── generate/       # Generación de horarios
│   │   │   ├── collaboration/  # Centro de colaboración
│   │   │   ├── friends/        # Sistema de amigos
│   │   │   ├── my-schedules/   # Horarios guardados
│   │   │   └── profile/        # Perfil de usuario
│   │   ├── auth/              # Autenticación
│   │   └── login/             # Inicio de sesión
│   ├── components/            # Componentes reutilizables
│   │   ├── ui/               # Componentes base (shadcn/ui)
│   │   ├── dashboard/        # Componentes del dashboard
│   │   └── collaboration/    # Componentes colaborativos
│   ├── services/             # APIs y servicios
│   ├── hooks/                # Hooks personalizados
│   └── stores/               # Estado global (Zustand)
```

### Backend (FastAPI + SQLAlchemy)
```
backend/
├── app/
│   ├── models/               # Modelos de base de datos
│   │   ├── user.py          # Usuarios y autenticación
│   │   ├── course.py        # Cursos y secciones
│   │   ├── schedule.py      # Horarios personales
│   │   ├── collaboration.py # Sesiones colaborativas
│   │   └── friendship.py    # Sistema de amigos
│   ├── routers/             # Endpoints de la API
│   │   ├── auth.py          # Autenticación
│   │   ├── courses.py       # Búsqueda de cursos
│   │   ├── schedules.py     # Generación de horarios
│   │   ├── collaboration.py # Colaboración
│   │   └── friends.py       # Sistema de amigos
│   ├── services/            # Lógica de negocio
│   └── utils/               # Utilidades y configuración
```

## 🚀 Funcionalidades Detalladas

### **1. Generación de Horarios** (`/dashboard/generate`)
- **Búsqueda de Cursos**: Encuentra cursos por código, nombre o profesor
- **Selección de Secciones**: Elige secciones específicas para cada curso
- **Generación Inteligente**: Algoritmo que crea todas las combinaciones válidas
- **Visualización de Resultados**: Ve múltiples opciones de horarios generados
- **Detección de Conflictos**: Identifica automáticamente choques de horarios

### **2. Centro de Colaboración** (`/dashboard/collaboration`)
- **Crear Sesiones**: Inicia sesiones colaborativas con códigos únicos
- **Unirse a Sesiones**: Únete usando códigos de sesión de 6 dígitos
- **Gestión de Cursos Compartidos**: Coordina materias comunes con el grupo
- **Cursos Individuales**: Mantén materias personales dentro de la sesión
- **Chat en Tiempo Real**: Comunicación integrada (WebSocket)
- **Invitación de Amigos**: Invita amigos directamente a sesiones

### **3. Sistema de Amigos** (`/dashboard/friends`)
- **Búsqueda de Estudiantes**: Encuentra compañeros por nombre, email o código
- **Solicitudes de Amistad**: Sistema completo de solicitudes y aceptación
- **Perfiles Detallados**: Ve información académica y estadísticas
- **Comparación de Horarios**: Compara tus horarios con los de tus amigos
- **Invitaciones Directas**: Invita amigos a sesiones colaborativas

### **4. Mis Horarios** (`/dashboard/my-schedules`)
- **Horarios Guardados**: Administra tus horarios favoritos
- **Comparación Visual**: Compara diferentes versiones de horarios
- **Exportación**: Descarga horarios en diferentes formatos
- **Histórico**: Mantén registro de horarios por semestre

### **5. Compartir Horarios**
- **Códigos de Compartición**: Genera códigos únicos de 8 caracteres
- **Enlaces Públicos**: Comparte horarios con enlaces directos
- **Control de Acceso**: Gestiona quién puede ver tus horarios
- **Revocación**: Revoca acceso cuando sea necesario

## 🎯 Casos de Uso Típicos

### **Para Estudiantes Individuales:**
1. Busca tus cursos del semestre
2. Selecciona las secciones que prefieres
3. Genera múltiples opciones de horarios
4. Guarda tu horario favorito
5. Compártelo con amigos o compañeros

### **Para Grupos de Estudio:**
1. Crea una sesión colaborativa
2. Invita a tus compañeros de grupo
3. Seleccionen juntos los cursos que van a llevar
4. Cada uno personaliza sus materias adicionales
5. Comparen y coordinen horarios finales

### **Para Coordinación Académica:**
1. Conecta con compañeros de carrera
2. Ve qué cursos están llevando tus amigos
3. Compara horarios para encontrar tiempos libres
4. Coordina horarios de estudio y trabajos grupales

## 🛠️ Tecnologías Utilizadas

### **Frontend:**
- **Next.js 15** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utilitarios
- **Radix UI** - Componentes accesibles
- **Zustand** - Gestión de estado
- **React Query** - Manejo de cache y sincronización
- **WebSocket** - Comunicación en tiempo real

### **Backend:**
- **FastAPI** - Framework web moderno y rápido
- **SQLAlchemy** - ORM para base de datos
- **PostgreSQL** - Base de datos relacional
- **Pydantic** - Validación de datos
- **JWT** - Autenticación segura
- **WebSocket** - Tiempo real
- **Cloudinary** - Manejo de imágenes

### **DevOps:**
- **Docker** - Containerización
- **Railway** - Deployment y hosting
- **GitHub Actions** - CI/CD

## 🏫 Universidades Soportadas

### **Actualmente Disponible:**
- **UTEC** (Universidad de Ingeniería y Tecnología)
  - ✅ Base de datos completa de cursos
  - ✅ Información de profesores actualizada
  - ✅ Sincronización semestral

### **Próximamente:**
- **UPC** (Universidad Peruana de Ciencias Aplicadas)
- **PUCP** (Pontificia Universidad Católica del Perú)
- **UNI** (Universidad Nacional de Ingeniería)

*¿Tu universidad no está? [Sugiérela aquí](mailto:support@schedulemaker.pe)*

## 🔧 Instalación y Desarrollo

### **Prerrequisitos:**
- Node.js 18+
- Python 3.8+
- PostgreSQL 12+
- Docker (opcional)

### **Configuración Rápida:**

1. **Clona el repositorio:**
```bash
git clone https://github.com/tu-usuario/schedule-maker-2.git
cd schedule-maker-2
```

2. **Backend:**
```bash
cd backend
pip install -r requirements.txt
# Configura variables de entorno en .env
python -m uvicorn app.main:app --reload
```

3. **Frontend:**
```bash
cd frontend
npm install
npm run dev
```

4. **Base de datos:**
```bash
# Las tablas se crean automáticamente al iniciar el backend
```

### **Con Docker:**
```bash
docker-compose up -d
```

## 📊 Características del Algoritmo

### **Generación de Horarios:**
- Evaluación de **todas las combinaciones posibles**
- Detección automática de **conflictos de tiempo**
- Optimización por **preferencias de horario**
- Consideración de **modalidades** (presencial/virtual)
- **Filtrado inteligente** de opciones inválidas

### **Colaboración en Tiempo Real:**
- Sincronización **inmediata** de cambios
- **Detección de conflictos** colaborativos
- **Notificaciones** de actualizaciones
- **Historial** de cambios por usuario

## 🔒 Seguridad

- **Autenticación JWT** segura
- **Validación de datos** en frontend y backend
- **Sanitización** de inputs del usuario
- **Protección CORS** configurada
- **Rate limiting** en APIs críticas
- **Encriptación** de passwords con bcrypt

## 📈 Próximas Funcionalidades

- [ ] **Notificaciones Push** - Alertas de cambios de horarios
- [ ] **Calendario Integrado** - Sincronización con Google Calendar
- [ ] **App Móvil** - Aplicación nativa para iOS y Android
- [ ] **IA Predictiva** - Recomendaciones inteligentes de horarios
- [ ] **Análisis de Rendimiento** - Estadísticas de carga académica
- [ ] **Integración Moodle** - Conexión directa con plataformas universitarias

## 🤝 Contribución

¡Contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: Amazing Feature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ve el archivo [LICENSE](LICENSE) para detalles.

## 👨‍💻 Autor

**Salinas** - [@salinsuwu](https://github.com/salinsuwu)

## 🙏 Agradecimientos

- Comunidad estudiantil de UTEC por el feedback inicial
- Contribuidores del proyecto
- Bibliotecas y frameworks open source utilizados

---

**¿Necesitas ayuda?** 
- 📧 Email: support@schedulemaker.pe
- 💬 Discord: [Schedule Maker Community](https://discord.gg/schedulemaker)
- 📖 Documentación: [docs.schedulemaker.pe](https://docs.schedulemaker.pe)

*Hecho con ❤️ para estudiantes universitarios*