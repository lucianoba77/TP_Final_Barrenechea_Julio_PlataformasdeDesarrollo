# MiMedicina Backend API

Backend API para la aplicación MiMedicina, construido con Node.js y Express.

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── config/          # Configuraciones (Firebase, JWT)
│   ├── controllers/     # Controladores de las rutas
│   ├── middleware/      # Middlewares (auth, roles, errores)
│   ├── routes/          # Definición de rutas
│   ├── services/        # Lógica de negocio
│   └── utils/           # Utilidades (vacía)
├── .env                 # Variables de entorno (no commitear)
├── .env.example         # Ejemplo de variables de entorno
├── package.json
└── server.js            # Punto de entrada
```

## 🔐 Autenticación

La API usa JWT (JSON Web Tokens) para autenticación. Los tokens se generan después de autenticarse con Firebase Auth.

### Uso del Token

Incluye el token en el header de las peticiones:

```
Authorization: Bearer <tu_token_jwt>
```

## 📝 Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/registro` - Registrar nuevo usuario
- `POST /api/auth/logout` - Cerrar sesión

### Medicamentos
- `GET /api/medicamentos` - Listar medicamentos
- `GET /api/medicamentos/:id` - Obtener un medicamento
- `POST /api/medicamentos` - Crear medicamento
- `PUT /api/medicamentos/:id` - Actualizar medicamento
- `DELETE /api/medicamentos/:id` - Eliminar medicamento
- `POST /api/medicamentos/:id/marcar-toma` - Marcar toma realizada

### Asistentes
- `GET /api/asistentes` - Listar asistentes
- `POST /api/asistentes` - Crear asistente
- `DELETE /api/asistentes/:id` - Eliminar asistente

## 🔧 Variables de Entorno

Ver `.env.example` para la lista completa de variables requeridas.

## 📚 Documentación

Para más detalles, consulta el `PLAN_DESARROLLO_BACKEND.md` en la raíz del proyecto.

