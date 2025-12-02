# Process SA · Backend (NestJS + Prisma + PostgreSQL)

API que expone autenticación JWT, gestión de usuarios/unidades, tareas y flujos con etapas y tareas por etapa. Pensado para Render (deploy) y PostgreSQL gestionado.

## Índice
- [Arquitectura y stack](#arquitectura-y-stack)
- [Variables de entorno](#variables-de-entorno)
- [Comandos](#comandos)
- [Endpoints principales](#endpoints-principales)
- [Modelo de datos](#modelo-de-datos)
- [Seed y datos demo](#seed-y-datos-demo)
- [Notas de seguridad](#notas-de-seguridad)
- [Despliegue en Render](#despliegue-en-render)

## Arquitectura y stack
- **Runtime:** NestJS 11 (REST), Prisma ORM, PostgreSQL.
- **Auth:** JWT (Bearer), bcrypt para hash de contraseñas, guards por rol (`JwtAuthGuard`, `RolesGuard`).
- **Módulos:** `auth`, `users`, `tasks`, `flows`, `prisma`.
- **DTO/Validación:** `class-validator` + `class-transformer`.

## Variables de entorno

| Clave          | Descripción                        | Ejemplo                                                               |
| -------------- | ---------------------------------- | --------------------------------------------------------------------- |
| `DATABASE_URL` | Cadena PostgreSQL completa         | `postgresql://user:pass@host:5432/db?sslmode=require`                 |
| `PORT`         | Puerto de escucha                  | `4000`                                                                |
| `JWT_SECRET`   | Clave de firmado de JWT            | `super-secret-key`                                                    |
| `DEFAULT_USER_PASSWORD` | Password default para seeds/creación sin password | `Process123*`                                                |

## Comandos

```bash
# instalar
npm install

# generar cliente Prisma
npx prisma generate

# aplicar migraciones
npx prisma migrate deploy   # producción
npx prisma migrate dev      # desarrollo

# seed idempotente
npx prisma db seed

# levantar API
npm run start:dev           # watch
npm run start:prod          # requiere build
```

## Endpoints principales (prefijo `/api`)

Auth  
- `POST /auth/login` → `{ accessToken, user }`  
- `POST /auth/register`

Público  
- `GET /public/options` → roles + unidades para el formulario de registro.

Usuarios/Unidades (requiere JWT)  
- `GET /users`, `GET /users/:id`, `POST /users` (ADMIN), `PATCH /users/:id` (ADMIN), `DELETE /users/:id` (ADMIN)  
- `PATCH /profile` (usuario autenticado)  
- `GET /roles`, `GET /units`, `POST /units` (ADMIN), `PATCH /units/:id` (ADMIN para actualizar líder/parent)

Tareas (JWT + guardia de rol)  
- `POST /tasks`, `GET /tasks`, `GET /tasks/:id`  
- `PATCH /tasks/:id`, `PATCH /tasks/:id/status`  
- `POST /tasks/:id/problems`, `POST /tasks/:id/subtasks`  
- `GET /tasks/alerts`, `GET /tasks/workload/summary`

Flujos (JWT; roles ADMIN/DESIGNER)  
- `POST /flows/templates`, `GET /flows/templates`, `DELETE /flows/templates/:id`  
- `POST /flows/instances` (acepta `stageTasks` por etapa), `GET /flows/instances`, `DELETE /flows/instances/:id`  
- `PATCH /flows/instances/:instanceId/stages/:stageId` (estado/progreso)
- `GET /flows/dashboard`

## Modelo de datos (resumen)

Roles y permisos  
- Enums `RoleKey { ADMIN, DESIGNER, FUNCTIONARY }`; tablas `Role`, `RolePermission`.

Organización  
- `Unit` (jerarquía `parentId`, `leadId`), `User` (relación `roleId`, `unitId`).

Tareas  
- `Task` con `TaskStatus`, `TaskPriority`, dependencias (`TaskDependency`), subtareas (`SubTask`), problemas (`TaskProblem`), historial (`TaskHistory`), tags (`TaskTag`).

Flujos  
- `FlowTemplate`, `FlowStage`, `FlowInstance`, `FlowStageStatus`; enum `FlowHealth`.

Notificaciones  
- `Notification` asociable a usuario/tarea/flujo.

Esquema completo: `prisma/schema.prisma`.

## Seed y datos demo

Archivo: `prisma/seed.ts` (idempotente; no borra si ya existe). Carga:
- Roles y permisos base.
- Unidades: Operaciones, Finanzas, Tecnología, Calidad (sin líder asignado).
- Usuarios: Gabriela (ADMIN), Joaquín (DESIGNER), María (FUNCTIONARY) con `Process123*`.
- Plantilla “Onboarding Cliente” con etapas y tareas por etapa.
- Instancia “Onboarding Cliente Kora” con estados de etapa y tareas ligadas.

Ejecutar: `npx prisma db seed`.

## Notas de seguridad
- JWT en header `Authorization: Bearer <token>`.
- Passwords con bcrypt. No usar `JWT_SECRET` por defecto en prod.
- CORS habilitado; restringir orígenes en despliegue.
- Guards por rol en controllers sensibles (ADMIN/DESIGNER).

## Despliegue en Render
- Variables: `DATABASE_URL`, `JWT_SECRET`, `PORT`.
- Comando de deploy sugerido:  
  `npx prisma migrate deploy && npx prisma db seed && npm run start:prod`
- URL de servicio: `https://<tu-back>.onrender.com/api` (usa `sslmode=require` en Render PG).
