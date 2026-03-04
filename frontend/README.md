# MiMedicina - Botiquín Virtual

Aplicación web para gestión de medicamentos dirigida a personas mayores y sus asistentes/cuidadores. Permite gestionar medicamentos, controlar adherencia al tratamiento, sincronizar con Google Calendar y compartir acceso con asistentes.

## 📋 Información del Proyecto

- **Nombre**: MiMedicina - Botiquín Virtual
- **Alumno**: Julio Luciano Barrenechea
- **Fecha de Entrega**: Diciembre 2024

## 🚀 Características

- **Dashboard**: Vista de medicamentos programados para el día con indicadores visuales de tomas
- **Botiquín**: Gestión completa de medicamentos (agregar, editar, suspender, eliminar, control de stock)
- **Historial**: Estadísticas de adherencia y resumen de tratamientos (diario, semanal, mensual, total)
- **Ajustes**: Configuración de asistentes, sincronización con Google Calendar y eliminación de cuenta
- **Sistema de Asistentes**: Permite a cuidadores/asistentes acceder al botiquín e historial del paciente
- **Programación Personalizada**: Configuración de días específicos de la semana y horarios personalizados para cada toma
- **Medicamentos Ocasionales**: Soporte para medicamentos sin horario fijo
- **Medicamentos Crónicos**: Tratamientos sin fin de fecha
- **Control de Stock**: Alertas inteligentes cuando el stock está bajo
- **Autenticación**: Login con email/password o Google
- **Sincronización con Google Calendar**: Eventos automáticos para recordatorios de tomas
  - Optimizado para aplicaciones no verificadas (máximo 30 eventos por medicamento)
  - Manejo automático de rate limiting
  - Creación inteligente de eventos con delays para evitar límites de la API
  - Soporte para programación personalizada con días y horarios específicos
- **Mobile-First**: Diseño optimizado para dispositivos móviles

## 🏗️ Arquitectura

El proyecto está dividido en **Frontend** y **Backend**, con comunicación mediante API REST.

### Estructura del Proyecto

```
MiMedicina/
├── src/                      # Frontend (React)
│   ├── components/           # Componentes reutilizables
│   │   ├── MainMenu.jsx
│   │   ├── MedicamentoCard.jsx
│   │   ├── UserMenu.jsx
│   │   ├── GestionarAsistentes.jsx
│   │   ├── GoogleCalendarSync.jsx
│   │   ├── ProgramacionPersonalizada.jsx
│   │   ├── ConfirmDialog.jsx
│   │   └── Toast.jsx
│   ├── context/              # Context API para estado global
│   │   ├── AuthContext.jsx
│   │   ├── MedContext.jsx
│   │   └── NotificationContext.jsx
│   ├── screens/              # Pantallas/Vistas
│   │   ├── LandingScreen.jsx
│   │   ├── LoginScreen.jsx
│   │   ├── DashboardScreen.jsx
│   │   ├── NuevaMedicinaScreen.jsx
│   │   ├── BotiquinScreen.jsx
│   │   ├── HistorialScreen.jsx
│   │   └── AjustesScreen.jsx
│   ├── services/             # Servicios para comunicación con API
│   │   ├── apiService.js
│   │   ├── authService.js
│   │   ├── medicamentosService.js
│   │   ├── asistentesService.js
│   │   └── calendarService.js
│   ├── utils/                # Utilidades
│   ├── hooks/                 # Custom hooks
│   ├── config/                # Configuración
│   └── App.jsx
│
└── backend/                  # Backend (Node.js/Express)
    ├── src/
    │   ├── config/           # Configuración
    │   │   ├── firebase-admin.js
    │   │   └── jwt.js
    │   ├── controllers/      # Controladores de rutas
    │   │   ├── authController.js
    │   │   ├── medicamentosController.js
    │   │   ├── asistentesController.js
    │   │   ├── usuariosController.js
    │   │   └── calendarController.js
    │   ├── middleware/       # Middleware
    │   │   ├── auth.js
    │   │   ├── roles.js
    │   │   └── errorHandler.js
    │   ├── routes/           # Definición de rutas
    │   │   ├── auth.js
    │   │   ├── medicamentos.js
    │   │   ├── asistentes.js
    │   │   ├── usuarios.js
    │   │   └── calendar.js
    │   ├── services/         # Lógica de negocio
    │   │   ├── jwtService.js
    │   │   ├── medicamentosService.js
    │   │   ├── asistentesService.js
    │   │   └── calendarService.js
    │   └── utils/
    ├── server.js             # Servidor principal
    └── package.json
```

## 🎨 Tecnologías Utilizadas

### Frontend
- **React 18.2.0** - Biblioteca de UI
- **React Router DOM 6.20.0** - Enrutamiento
- **React Bootstrap** - Componentes UI
- **Firebase** - Autenticación (solo frontend)
- **Context API** - Gestión de estado global
- **CSS Modules** - Estilos modulares

### Backend
- **Node.js** - Entorno de ejecución
- **Express 5.2.1** - Framework web
- **Firebase Admin SDK 13.6.0** - Acceso a Firestore desde backend
- **jsonwebtoken 9.0.3** - Generación y verificación de JWT
- **express-validator 7.3.1** - Validación de datos
- **googleapis 168.0.0** - Integración con Google Calendar
- **cors 2.8.5** - Manejo de CORS
- **dotenv 17.2.3** - Variables de entorno

### Base de Datos
- **Firestore** - Base de datos NoSQL (acceso desde backend)

## ✅ Cumplimiento de Requisitos

### Usuarios (Mínimo 2 tipos)
- ✅ **Paciente**: Usuario principal con acceso completo a todas las funcionalidades
- ✅ **Asistente**: Usuario con acceso de solo lectura al botiquín e historial del paciente

### Seguridad
- ✅ Autenticación mediante JWT (JSON Web Tokens)
- ✅ Access tokens implementados
- ✅ Endpoints protegidos con middleware de autenticación
- ✅ Validación de roles (paciente/asistente)

### API REST
- ✅ Endpoints REST implementados:
  - `/api/auth` - Autenticación
  - `/api/medicamentos` - Gestión de medicamentos
  - `/api/asistentes` - Gestión de asistentes
  - `/api/usuarios` - Gestión de usuarios
  - `/api/calendar` - Sincronización con Google Calendar
- ✅ Métodos HTTP: GET, POST, PUT, DELETE
- ✅ Formato JSON para todas las respuestas

### Separación Frontend/Backend
- ✅ Frontend: React (carpeta `src/`)
- ✅ Backend: Node.js/Express (carpeta `backend/`)
- ✅ Comunicación mediante HTTP/REST
- ✅ Lógica de negocio en el backend

## 📱 Vistas y Rutas

- `/` - Landing page (pantalla de inicio/marketing)
- `/login` - Inicio de sesión
- `/dashboard` - Dashboard principal (solo pacientes)
- `/nuevo` - Agregar/editar medicamento
- `/botiquin` - Lista de medicamentos (pacientes y asistentes)
- `/historial` - Estadísticas y adherencia (pacientes y asistentes)
- `/ajustes` - Configuración (solo pacientes)

## 🔒 Roles y Permisos

- **Paciente**: Acceso completo a todas las funcionalidades
- **Asistente**: Acceso de solo lectura al botiquín e historial del paciente asignado

## 🔐 Credenciales de Login

### Paciente
- **Email**: mimedicinaprueba@gmail.com
- **Password**: 123456@@
- **También se puede loguear con cuenta de Google**

### Asistente
- **Email**: miasistente@mimedicina.com
- **Password**: 123456@@
- **Solo con usuario y contraseña**



## ⚠️ Limitaciones de Google Calendar

Para aplicaciones no verificadas, Google Calendar API tiene límites estrictos:
- **Máximo 30 eventos por medicamento**: Para evitar rate limiting, el sistema limita la creación de eventos
- **Medicamentos crónicos**: Se crean eventos solo para las próximas 4 semanas (28 días)
- **Rate limiting automático**: El sistema detecta y maneja automáticamente los límites de la API
- **Delays entre requests**: Se agregan delays de 200ms entre cada creación de evento para evitar exceder los límites

