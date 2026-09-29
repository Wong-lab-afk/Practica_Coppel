# Examen Práctico — Gestión de Usuarios y Tareas

Aplicación web Full-Stack para gestionar usuarios y las tareas asignadas a cada uno.

## Stack utilizado

- **Backend:** Node.js (módulo `http` nativo, sin Express) + **PostgreSQL** mediante el paquete `pg`.
- **Frontend:** HTML + CSS + JavaScript puro (sin frameworks), consumiendo la API vía `fetch`.
- **Base de datos:** PostgreSQL (corriendo en un contenedor Docker con la configuración de `docker-compose.yml`).

> ¿Por qué sin Express? El código está organizado por funciones (una por endpoint) para que migrarlo a Express sea trivial si lo prefieres — ver sección "Migrar a Express" más abajo.

## Estructura del proyecto

```text
examen-practico/
├── docker-compose.yml           # Configuración del contenedor de PostgreSQL
├── backend/
│   ├── server.js                # Arranca el servidor, sirve estáticos, delega a router.js
│   ├── router.js                # Tabla de rutas (método + URL -> controlador)
│   ├── db.js                    # Conexión PostgreSQL + esquema (CREATE TABLE)
│   ├── models/
│   │   ├── usuariosModel.js     # Único lugar con SQL de usuarios
│   │   ├── tareasModel.js       # Único lugar con SQL de tareas
│   │   ├── puestosModel.js      # Único lugar con SQL de puestos
│   │   └── seed.js              # Datos de ejemplo (solo si la BD está vacía)
│   ├── controllers/
│   │   ├── usuariosController.js  # Validación + orquestación (sin SQL)
│   │   ├── tareasController.js
│   │   └── puestosController.js
│   ├── utils/http.js            # sendJSON, readJSONBody, HttpError, CORS
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── js/
│       ├── api.js               # Único lugar que hace fetch() al backend
│       ├── state.js             # Estado centralizado (single source of truth)
│       ├── render.js            # Pinta el DOM a partir del estado
│       ├── modals.js            # Estado local de los modales (crear/editar/confirmar)
│       └── main.js              # Conecta eventos -> api -> state -> render
└── README.md
```

Cada capa tiene una sola responsabilidad: los **modelos** son el único código que escribe SQL, los **controladores** validan y orquestan (sin SQL), y `server.js`/`router.js` solo enrutan peticiones HTTP. En el frontend, **state.js** es la única fuente de verdad de los datos en memoria; **render.js** solo lee ese estado y actualiza el DOM (nunca al revés); **main.js** es el único que conecta eventos del usuario con llamadas a la API.

### Manejo de estado (frontend)

El estado vive en un solo objeto (`state.js`) con un patrón *observer*: cada mutación (`agregarUsuario`, `quitarTarea`, etc.) notifica a quien esté suscrito, y `main.js` suscribe una única función `renderAll` que repinta la vista activa. Las vistas nunca guardan su propia copia de los datos ni se actualizan "a mano" — evita que la UI se desincronice del estado real.

Esto también evita peticiones redundantes al servidor: cuando el backend responde a un `POST`/`PUT`/`DELETE` ya devuelve el recurso actualizado, así que el estado se actualiza con **esa** respuesta en vez de volver a pedir la lista completa con un `GET`. Por ejemplo, crear una tarea añade solo esa tarea al estado local; no se vuelve a pedir el usuario entero. Al reasignar una tarea a otro usuario, `actualizarTareaEnEstado` la quita de la vista actual si ya no le pertenece, en vez de dejarla "fantasma" en pantalla.

## Cómo ejecutarlo

Requisito: **Node.js 22.5 o superior** (`node -v` para comprobarlo) y **Docker** para la base de datos.

1. Levanta la base de datos PostgreSQL:

```bash
docker-compose up -d
```

2. Instala las dependencias e inicia el backend:

```bash
cd backend
npm install
npm start
```

Abre **http://localhost:3000** en el navegador. El propio backend sirve el frontend (mismo origen), así que no hace falta levantar nada más.

Para reiniciar con datos limpios, puedes destruir el volumen de Docker y volver a levantar el contenedor (`docker-compose down -v && docker-compose up -d`). El servidor recreará las tablas e insertará datos de ejemplo automáticamente si la BD está vacía al iniciar.

## Modelo de datos

**puestos**
| campo | tipo |
|---|---|
| id | SERIAL PK |
| nombre | TEXT (único) |

**usuarios**
| campo | tipo |
|---|---|
| id | SERIAL PK |
| puesto_id | INTEGER (FK → puestos.id) |
| nombre | TEXT |
| apellido | TEXT |
| email | TEXT (único) |
| telefono | TEXT |
| created_at | TIMESTAMPTZ |

**tareas**
| campo | tipo |
|---|---|
| id | SERIAL PK |
| usuario_id | INTEGER (FK → usuarios.id, ON DELETE CASCADE) |
| titulo | TEXT |
| descripcion | TEXT |
| fecha | TEXT |
| estatus | TEXT (`pendiente` \| `en_progreso` \| `completada`) |
| prioridad | TEXT (`urgente` \| `alta` \| `media` \| `baja`) |
| created_at | TIMESTAMPTZ |

Relación 1 (usuario) a N (tareas). Al eliminar un usuario, sus tareas se eliminan en cascada (`ON DELETE CASCADE`).

## Endpoints de la API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/puestos` | Lista todos los puestos |
| GET | `/api/usuarios` | Lista todos los usuarios |
| GET | `/api/usuarios/:id` | Obtiene un usuario con sus tareas |
| POST | `/api/usuarios` | Crea un usuario (`nombre`, `apellido`, `email` obligatorios; `puesto_id`, `telefono` opcionales) |
| PUT | `/api/usuarios/:id` | Actualiza un usuario |
| DELETE | `/api/usuarios/:id` | Elimina un usuario y sus tareas |
| POST | `/api/usuarios/:id/tareas` | Crea una tarea para ese usuario (`titulo` obligatorio) |
| PUT | `/api/tareas/:id` | Actualiza una tarea (incluye `usuario_id` para reasignarla a otro usuario) |
| DELETE | `/api/tareas/:id` | Elimina una tarea |

Todas las respuestas son JSON. Errores de validación devuelven `400`, no encontrado `404`, email duplicado `409`.

### Ejemplos rápidos (curl)

```bash
curl -X POST http://localhost:3000/api/usuarios \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Ana","apellido":"García","email":"ana@example.com","telefono":"555-1234","puesto_id":1}'

curl http://localhost:3000/api/usuarios/1

curl -X POST http://localhost:3000/api/usuarios/1/tareas \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Preparar informe","fecha":"2026-10-01","estatus":"pendiente","prioridad":"alta"}'

curl -X PUT http://localhost:3000/api/tareas/1 \
  -H "Content-Type: application/json" \
  -d '{"estatus":"completada","prioridad":"baja","usuario_id":2}'
```

## Funcionalidad del frontend

- **Listado de usuarios** con tarjetas (nombre, email, teléfono, puesto).
- **Vista de detalle** al hacer clic en un usuario: datos personales + tabla de tareas asignadas.
- **Formularios (modal)** para crear/editar usuarios y tareas, con validación básica y mensajes de error de la API.
- **Reasignar tarea:** el formulario de tarea incluye un selector de "Asignado a" que permite cambiar el usuario dueño de la tarea.
- **Eliminar** usuario o tarea con confirmación previa (eliminar un usuario advierte que también borrará sus tareas).
- Mensajes de éxito/error tipo *toast*.

## Migrar a Express (opcional)

Si quieres usar Express en lugar del router nativo, instala las dependencias (con conexión a internet):

```bash
npm install express cors
```

Y reemplaza `router.js` por `app.get/post/put/delete(...)`, reutilizando directamente las funciones de `controllers/` — su firma `(req, res)` es compatible con un handler de Express.
