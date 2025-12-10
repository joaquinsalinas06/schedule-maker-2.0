# 🎨 PROMPT PARA STITCH - Schedule Maker UI/UX Improvement

## 📋 CONTEXTO DEL PROYECTO

**Schedule Maker** es una aplicación web para estudiantes universitarios peruanos (principalmente UTEC) que permite:
- Buscar cursos y secciones
- Generar combinaciones de horarios sin conflictos automáticamente
- Guardar horarios favoritos
- Colaborar con amigos para crear horarios grupales
- Comparar horarios entre amigos
- Gestionar perfil y amigos

**Stack Tecnológico:**
- Next.js 15 con App Router
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Tema oscuro (gray-950 como base)

---

## 🗺️ MAPA DE PANTALLAS Y COMPONENTES

### 1. LANDING PAGE (`/`)
**Propósito:** Página principal de marketing que convence a usuarios de registrarse.

**Secciones:**
- **Hero Section:** Título "Crea tu horario perfecto en minutos", CTA "Comenzar gratis", badge "Optimiza tu tiempo académico"
- **Benefits Grid:** 4 cards (Ahorra Tiempo, Cero Conflictos, Trabajo en Equipo, Multiplataforma)
- **University Tabs:** Tabs para UTEC/UPC/PUCP/UNI (solo UTEC disponible, otros "Próximamente")
- **CTA Final:** Repetición del call-to-action

**Componentes:**
- Navbar (Logo, links: Cómo funciona, Universidades, botón Ingresar)
- Footer
- Cards con iconos Lucide
- Tabs de shadcn

**Problemas actuales de UX:**
- Mucho scroll para llegar al CTA
- Las tabs de universidades no disponibles no dan información útil
- No hay social proof (testimonios, número de usuarios)

---

### 2. AUTH PAGE (`/auth`)
**Propósito:** Login y Registro de usuarios.

**Flujo de Registro:**
1. Formulario (email, nombre, apellido, código estudiante UTEC, contraseña)
2. Verificación de email (envío de código 6 dígitos)
3. Confirmación y redirect al dashboard

**Componentes:**
- Split layout (izquierda: branding/benefits, derecha: formulario)
- Tabs Login/Registro
- Input fields con iconos
- Validación en tiempo real
- Componente EmailVerification (envío/reenvío de código)

**Problemas actuales de UX:**
- El flujo de verificación de email puede confundir (no queda claro cuándo esperar)
- Muchos campos en registro sin indicador de progreso
- Los errores aparecen inline pero pueden pasar desapercibidos
- No hay password strength indicator

---

### 3. DASHBOARD LAYOUT
**Propósito:** Contenedor principal del dashboard con navegación.

**Componentes:**
- **Sidebar (Desktop):** Avatar usuario, navegación colapsible (Generar, Ver Horarios, Mis Horarios, Colaboración, Amigos), indicador de sección activa
- **Mobile Header:** Hamburger menu, nombre de sección actual
- **FirstTimeUserPopup:** Tutorial de bienvenida para nuevos usuarios
- **HelpButton:** Botón flotante de ayuda

**Navegación:**
- Generar Horarios → /dashboard/generate
- Ver Horarios → /dashboard/schedules
- Mis Horarios (Favoritos) → /dashboard/my-schedules
- Colaboración → /dashboard/collaboration
- Mis Amigos → /dashboard/friends
- Perfil → /dashboard/profile

---

### 4. GENERATE PAGE (`/dashboard/generate`)
**Propósito:** Buscar cursos y seleccionar secciones para generar horarios.

**Flujo:**
1. Usuario busca curso por nombre o código
2. Aparecen resultados con secciones disponibles
3. Click en curso → popup con detalles de secciones (profesor, horario, modalidad)
4. Selecciona secciones deseadas
5. Secciones aparecen en panel lateral
6. Click "Generar Horarios" → redirect a /schedules

**Componentes:**
- **CourseSearchCard:** Input de búsqueda con filtros (departamento)
- **CourseResultsGrid:** Grid de cursos encontrados
- **SectionSelectionPopup:** Modal con detalles de cada sección
- **SelectedSectionsCard:** Panel lateral con secciones seleccionadas

**Problemas actuales de UX:**
- El popup de secciones puede ser abrumador con muchas opciones
- No hay preview visual del horario mientras selecciona
- No queda claro qué significa cada campo (modalidad, tipo de sesión)
- Contador de secciones/cursos pequeño y poco visible

---

### 5. SCHEDULES PAGE (`/dashboard/schedules`)
**Propósito:** Ver horarios generados y guardarlos como favoritos.

**Funcionalidades:**
- Visualización de horarios en formato canvas (grilla semanal)
- Navegación entre combinaciones (anterior/siguiente)
- Agregar/quitar de favoritos (corazón)
- Descargar como imagen PNG
- Búsqueda adicional de cursos para agregar

**Componentes:**
- **ScheduleVisualization:** Canvas interactivo con la grilla del horario
  - Días de la semana en columnas (Lunes-Sábado)
  - Horas en filas (7:00-22:00)
  - Bloques de colores por curso
  - Información: curso, sección, profesor, aula
- **SelectedSectionsCard:** Panel de secciones actuales
- Controles de navegación y acciones

**Problemas actuales de UX:**
- La visualización puede ser difícil de leer en móvil
- No hay indicador de conflictos si los hubiera
- El botón de favoritos podría tener mejor feedback
- No hay forma de comparar dos combinaciones lado a lado

---

### 6. MY SCHEDULES PAGE (`/dashboard/my-schedules`)
**Propósito:** Ver y gestionar horarios guardados como favoritos.

**Funcionalidades:**
- Lista de horarios favoritos
- Ver detalles de cada horario
- Editar nombre/notas
- Eliminar favorito
- Compartir horario (genera código único)
- Comparar con amigos

**Componentes:**
- **FavoriteSchedules:** Lista/grid de horarios guardados
  - Card por horario con preview miniatura
  - Nombre editable
  - Fecha de creación
  - Acciones (ver, editar, compartir, eliminar, comparar)

**Problemas actuales de UX:**
- Las miniaturas pueden no ser lo suficientemente claras
- No hay organización/folders para muchos horarios
- El flujo de compartir podría ser más intuitivo

---

### 7. COLLABORATION PAGE (`/dashboard/collaboration`)
**Propósito:** Crear sesiones colaborativas para generar horarios en grupo.

**Tabs:**
1. **Sesiones:** Crear/unirse a sesiones colaborativas
2. **Compartidos:** Ver horarios compartidos por código
3. **Comparar:** Comparar horarios con amigos

**Componentes:**
- **SessionManager:** Lista de sesiones activas, crear nueva, unirse por código
- **CreateJoinSession:** Modal para crear o unirse a sesión
- **EnhancedCollaborativeBuilder:** Editor colaborativo en tiempo real
- **SharedScheduleWrapper:** Visualizar horario compartido por código
- **IntegratedScheduleComparison:** Comparar horarios de múltiples usuarios
- **FriendInviteModal:** Invitar amigos a sesión

**Problemas actuales de UX:**
- El concepto de "sesión colaborativa" puede no ser intuitivo
- Muchas sub-funcionalidades en una sola página
- La comparación de horarios necesita mejor visualización de diferencias

---

### 8. FRIENDS PAGE (`/dashboard/friends`)
**Propósito:** Gestionar lista de amigos y solicitudes.

**Tabs:**
1. **Amigos:** Lista de amigos actuales
2. **Buscar:** Buscar usuarios para agregar
3. **Solicitudes:** Ver solicitudes pendientes (recibidas/enviadas)

**Componentes:**
- Lista de amigos con avatar, nombre, acciones
- Búsqueda de usuarios
- Cards de solicitudes con aceptar/rechazar
- **FriendProfileModal:** Ver perfil de amigo con sus horarios

**Problemas actuales de UX:**
- La búsqueda requiere mínimo 2 caracteres sin feedback claro
- No hay sugerencias de "personas que quizás conozcas"
- El estado de solicitud enviada podría ser más claro

---

### 9. PROFILE PAGE (`/dashboard/profile`)
**Propósito:** Ver y editar información personal.

**Secciones:**
- Avatar con opción de cambiar foto
- Información personal (nombre, nickname)
- Descripción/bio
- Información de cuenta (email, código estudiante, universidad)

**Componentes:**
- **ProfileEditModal:** Modal para editar campos específicos
- Cards informativas
- Avatar con indicador de edición

**Problemas actuales de UX:**
- Edición por campos separados en vez de formulario unificado
- No hay preview de cómo se verá el perfil para otros
- Falta indicador de campos obligatorios vs opcionales

---

### 10. HOW IT WORKS PAGE (`/how-it-works`)
**Propósito:** Documentación/guía de uso de la aplicación.

**Secciones:**
- Sidebar de navegación por sección
- Contenido detallado de cada feature
- Capturas de pantalla y ejemplos

---

### 11. UNIVERSITIES PAGE (`/universities`)
**Propósito:** Mostrar universidades disponibles y próximas.

**Grid de universidades con estado disponible/próximamente.**

---

## 🎯 HEURÍSTICAS DE NIELSEN A EVALUAR

Por favor evalúa cada pantalla según estas heurísticas:

1. **Visibilidad del estado del sistema:** ¿El usuario siempre sabe qué está pasando?
2. **Coincidencia entre sistema y mundo real:** ¿El lenguaje es natural para estudiantes?
3. **Control y libertad del usuario:** ¿Puede deshacer acciones fácilmente?
4. **Consistencia y estándares:** ¿Los patrones son consistentes en toda la app?
5. **Prevención de errores:** ¿Se previenen errores antes de que ocurran?
6. **Reconocimiento antes que recuerdo:** ¿La información está visible cuando se necesita?
7. **Flexibilidad y eficiencia:** ¿Hay atajos para usuarios expertos?
8. **Diseño estético y minimalista:** ¿Hay información irrelevante?
9. **Ayuda para reconocer y recuperarse de errores:** ¿Los mensajes de error son claros?
10. **Ayuda y documentación:** ¿Hay ayuda contextual disponible?

---

## 🔄 FEEDBACK PATTERNS ACTUALES

### Estados de carga:
- Spinner circular con texto "Cargando..."
- Skeleton loaders (mínimo uso)

### Notificaciones:
- Toast notifications (éxito verde, error rojo)
- Inline errors en formularios

### Confirmaciones:
- `confirm()` nativo para eliminaciones (poco elegante)

### Empty states:
- Iconos grises con texto descriptivo
- A veces falta CTA para guiar al usuario

---

## 📱 RESPONSIVE DESIGN

**Breakpoints actuales:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

**Adaptaciones:**
- Sidebar → Bottom navigation o hamburger
- Grids reducen columnas
- Canvas del horario se adapta (menor legibilidad)

---

## 🎨 SISTEMA DE DISEÑO ACTUAL

### Colores:
- **Background:** gray-950, gray-900
- **Primary:** cyan-600, cyan-400
- **Accent:** teal-600, purple-600, orange-400
- **Text:** white, gray-300, gray-400
- **Success:** green-500
- **Error:** red-500

### Tipografía:
- Font: Geist Sans (variable)
- Headings: Bold (text-2xl a text-4xl)
- Body: Regular (text-sm a text-base)

### Espaciado:
- Padding: p-4 (móvil), p-6 (tablet), p-8 (desktop)
- Gaps: gap-4 a gap-8

### Animaciones:
- `animate-in fade-in slide-in-from-*`
- `duration-500` a `duration-700`
- Hover scales y color transitions

---

## ✅ LO QUE NECESITO QUE HAGAS

1. **Auditoría UX completa** de cada pantalla según las heurísticas de Nielsen
2. **Propuestas de mejora específicas** para:
   - Flujos de usuario más intuitivos
   - Mejor feedback visual y microinteracciones
   - Estados de carga, vacío y error mejorados
   - Onboarding más efectivo
3. **Wireframes o mockups** de las mejoras propuestas
4. **Priorización** de cambios por impacto/esfuerzo

### Enfócate especialmente en:
- El flujo de generación de horarios (core feature)
- La visualización del horario (debe ser clara y atractiva)
- La colaboración (diferenciador de la app)
- Mobile experience (muchos estudiantes usan celular)

---

## 📸 CAPTURAS DE REFERENCIA

[Aquí iría una carpeta con capturas de cada pantalla en desktop y móvil]

---

## 🚀 OBJETIVO FINAL

Crear una experiencia de usuario que sea:
- **Intuitiva:** Un estudiante nuevo debería poder generar su primer horario en < 5 minutos
- **Delightful:** Microinteracciones y feedback que hagan la app agradable de usar
- **Eficiente:** Usuarios frecuentes deben poder hacer todo rápidamente
- **Accesible:** Funcionar bien en móvil y con diferentes capacidades
- **Profesional:** Que inspire confianza y se vea moderna

---

*Generado para revisión de UX por AI Design Assistant*


