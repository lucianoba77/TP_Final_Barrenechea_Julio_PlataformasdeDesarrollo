# MiMedicina

Botiquín virtual para gestión de medicamentos. Permite registrar medicamentos, programar tomas, control de stock y adherencia, sincronizar con Google Calendar y delegar vista/acciones a asistentes (familiares o cuidadores).

## Requisitos previos

- **Node.js** (recomendado LTS)
- Cuenta **Firebase** con proyecto (Auth y Firestore)
- **Google Cloud** (opcional): proyecto con Calendar API y OAuth para Google Calendar

## Estructura del proyecto

- **frontend/** — Aplicación React (Create React App). Puerto **3000**.
- **backend/** — API Express. Puerto **3001**.
- La raíz tiene un `package.json` heredado; el código activo está en `frontend/` y `backend/`.

## Cómo correr el proyecto

### Opción A: Dos terminales (recomendado para desarrollo)

**Terminal 1 — Backend**

```bash
cd backend
npm install
```

Crear archivo `.env` en `backend/` (ver sección Variables de entorno - Backend). Luego:

```bash
npm run dev
```

El API quedará en **http://localhost:3001**. Health: http://localhost:3001/health

**Terminal 2 — Frontend**

```bash
cd frontend
npm install
```

Copiar `frontend/.env.example` a `frontend/.env` y completar las variables (ver sección Variables de entorno - Frontend). Luego:

```bash
npm start
```

La app se abrirá en **http://localhost:3000**.

### Opción B: Desde Visual Studio Code (una sola acción)

1. Abrir la carpeta **MiMedicina** en VS Code.
2. Terminal → **Run Task…** (o `Ctrl+Shift+B` si está configurado).
3. Elegir **"MiMedicina: Backend + Frontend"**.

Se abrirán dos terminales: una con el backend y otra con el frontend. Debes tener ya configurados los `.env` en `backend/` y `frontend/`.

## Variables de entorno

### Frontend (`frontend/.env`)

Copiar desde `frontend/.env.example` y completar:

| Variable | Descripción |
|----------|-------------|
| `REACT_APP_FIREBASE_API_KEY` | API Key de Firebase |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | Dominio de Auth (ej. `tu-proyecto.firebaseapp.com`) |
| `REACT_APP_FIREBASE_PROJECT_ID` | ID del proyecto Firebase |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | Bucket de Storage |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | Sender ID de Messaging |
| `REACT_APP_FIREBASE_APP_ID` | App ID de Firebase |
| `REACT_APP_FIREBASE_MEASUREMENT_ID` | Measurement ID (analytics, opcional) |
| `REACT_APP_GOOGLE_CLIENT_ID` | Client ID de OAuth (opcional, para Google Calendar) |
| `REACT_APP_API_URL` | URL base del API (opcional; por defecto `http://localhost:3001/api`) |

Credenciales Firebase: [Firebase Console](https://console.firebase.google.com/) → Tu proyecto → Configuración del proyecto → Tus aplicaciones → Configuración de SDK.

Para **Google Calendar**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → tu cliente OAuth (tipo "Aplicación web").  
- **URIs de redirección autorizados**: añadir exactamente `http://localhost:3000/auth/google/callback` (y en producción la URL de tu app + `/auth/google/callback`).  
- La app usa flujo con código: el backend intercambia el código por tokens y guarda `refresh_token` para renovar el acceso sin volver a pedir permiso al usuario. Para ello el backend necesita el **Client Secret** del mismo cliente (ver variables de entorno del backend).

### Backend (`backend/.env`)

Usar como referencia `backend/.env.example` (si existe) o crear `.env` con:

| Variable | Obligatorio | Descripción |
|----------|-------------|-------------|
| `FIREBASE_PROJECT_ID` | Sí | ID del proyecto Firebase |
| `FIREBASE_PRIVATE_KEY` | Sí | Clave privada de la cuenta de servicio (entre comillas si hay `\n`) |
| `FIREBASE_CLIENT_EMAIL` | Sí | Email de la cuenta de servicio de Firebase |
| `JWT_SECRET` | Recomendado | Clave secreta para firmar JWTs (cambiar en producción) |
| `JWT_EXPIRES_IN` | No | Ej. `7d` (por defecto 7 días) |
| `PORT` | No | Puerto del servidor (por defecto 3001) |
| `FRONTEND_URL` | No | Origen permitido para CORS (ej. `http://localhost:3000`) |
| `NODE_ENV` | No | `development` o `production` |
| `REACT_APP_GOOGLE_CLIENT_ID` | No (Calendar) | Mismo Client ID que el frontend (OAuth web) |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | No (Calendar) | Client Secret del cliente OAuth (para flujo con código y renovación) |
| `GOOGLE_CALENDAR_REDIRECT_URI` | No (Calendar) | URI de callback (ej. `http://localhost:3000/auth/google/callback`) |

Credenciales Firebase Admin: Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada. Copiar `project_id`, `private_key` y `client_email` al `.env`.

## Puertos

| Servicio | Puerto |
|----------|--------|
| Frontend (CRA) | 3000 |
| Backend (Express) | 3001 |

## Stack

- **Frontend:** React 18, React Router 6, React Bootstrap, Firebase (cliente), Google OAuth.
- **Backend:** Node.js (ES modules), Express 5, Firebase Admin, Firestore, JWT, express-validator.
- **Base de datos:** Firebase Firestore (NoSQL).

## Licencia

Proyecto privado / uso educativo.
