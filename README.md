# Process SA · Backend (NestJS + Prisma + PostgreSQL)

Backend REST modular con autenticación JWT, gestión de usuarios/unidades, tareas, flujos con etapas y cálculo jerárquico de progreso (tarea → etapa → flujo). Diseñado para Render + PostgreSQL, usando patrones de inyección de dependencias, DTOs y guards de NestJS.

---

## Índice
- [Arquitectura y patrones](#arquitectura-y-patrones)
- [Estructura del proyecto y jerarquía de carpetas](#estructura-del-proyecto-y-jerarquía-de-carpetas)
- [Modelo de datos (Prisma)](#modelo-de-datos-prisma)
- [Relaciones, cascadas y reglas de negocio](#relaciones-cascadas-y-reglas-de-negocio)
- [Cálculo de progreso (tareas → etapas → flujos)](#cálculo-de-progreso-tareas--etapas--flujos)
- [Variables de entorno](#variables-de-entorno)
- [Comandos y scripts](#comandos-y-scripts)
- [API y endpoints clave](#api-y-endpoints-clave)
- [Contratos DTO (resumen)](#contratos-dto-resumen)
- [Migraciones y seed](#migraciones-y-seed)
- [Despliegue en Render](#despliegue-en-render)
- [Seguridad y buenas prácticas](#seguridad-y-buenas-prácticas)
- [Guía de smoke tests](#guía-de-smoke-tests)
- [Troubleshooting rápido](#troubleshooting-rápido)
- [Extensiones y roadmaps sugeridos](#extensiones-y-roadmaps-sugeridos)
- [Convenciones de estilo y calidad](#convenciones-de-estilo-y-calidad)
- [FAQ corta](#faq-corta)
- [Próximos pasos y escalabilidad](#próximos-pasos-y-escalabilidad)

---

## Resumen del caso "Control de Tareas" (PDF)

**Contexto**: clientes de Process SA tienen problemas de orden y control de procesos; no miden rendimiento, sufren atrasos y no hay plataforma tecnológica que soporte el flujo operativo ni la coordinación entre unidades.

**Problema**: sin sistema de información, no hay trazabilidad, notificaciones ni control de plazos; se pierden asignaciones y no existen indicadores globales/por unidad/tarea. Acciones correctivas llegan tarde.

**Solución propuesta en el PDF**: sistema que modele organización y roles, defina flujos/tareas, permita instanciar procesos, asignar responsables y plazos, controlar cumplimiento con alertas y gráficos de avance, accesible para todos los empleados (web/escritorio/móvil).

**Requerimientos funcionales (resumen)**:
- Roles: administrador, diseñador de procesos, funcionario.
- CRUD de usuarios, roles, unidades (jerarquía), creación de tareas con responsables, plazos, dependencias, subtareas, tareas relacionadas.
- Flujos tipo instanciables (procesos repetitivos), aceptación/rechazo de tareas con justificación, panel personal con semáforo (verde/amarillo/rojo), cálculo de avance por tiempo y duración.
- Reporte de problemas/bloqueos; alertas de atraso; carga de trabajo por funcionario; tablero global por unidad; ejecución de flujos.

**Requerimientos no funcionales (PDF)**:
- Capas separadas, seguridad (sesiones, enmascarado de clave), responsive; reportes PDF; notificaciones por email/móvil; uso de BD Oracle y PL/SQL (en nuestro stack usamos PostgreSQL/Prisma).
- Manuales de usuario y mensajes de error claros.

**Casos de uso (cuadro PDF)**: CU1-CU19 (crear usuarios/unidades/roles/tareas/subtareas, asignar responsable, calcular avance, devolver/reasignar/terminar tarea, alertar atraso, semáforo, reportar problema, carga de trabajo, resumen, ejecutar flujo).

**Iteraciones sugeridas en el PDF**: 3 iteraciones incrementales (análisis/diseño inicial + autenticación/mantenedores; negocio y pruebas; integración, soporte y cierre).

---

## Cobertura del sistema vs requerimientos (alto nivel)

- **Roles y jerarquía**: soportados (ADMIN/DESIGNER/FUNCTIONARY; unidades jerárquicas con líder).
- **CRUD maestros**: usuarios, roles (via seed), unidades, plantillas de flujo, instancias de flujo, tareas, subtareas, dependencias, problemas.
- **Flujos tipo e instancias**: implementado; plantillas con etapas, instanciación con tareas por etapa y responsables.
- **Progreso y semáforo**: cálculo jerárquico tarea → etapa → flujo; estados y health; alertas de tareas bloqueadas/vencidas.
- **Panel personal y carga de trabajo**: workload summary y alertas; panel de tareas en front.
- **Reportes/indicadores**: dashboards en front (KPIs, ranking por unidad/usuario, distribución de estados).
- **Notificaciones**: básicas internas (lista en front a partir de alerts); extensible a email/push.
- **Rechazo/aceptación**: cambio de estado y progreso; falta módulo de justificación explícita (pendiente si se requiere exacto como PDF).
- **Stack**: usamos NestJS + Prisma + PostgreSQL (no Oracle/PLSQL); responsive web; sin módulo escritorio nativo.

---
- [Próximos pasos y escalabilidad](#próximos-pasos-y-escalabilidad)

---

## Arquitectura y patrones

| Capa / Patrón            | Implementación                                      | Notas                                                                           |
| ------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------- |
| Inyección de dependencias| NestJS DI containers                               | `@Injectable()` en services; Prisma se provee vía `PrismaModule`.               |
| Patrón Controller/Service| Controllers finos, Services con lógica de dominio  | Controllers validan DTOs y delegan; Services orquestan Prisma y reglas.         |
| DTO + Validación         | `class-validator` + `class-transformer`            | DTO por operación; pipes de validación integrados en Nest.                      |
| Guards / Estrategias     | `JwtAuthGuard`, `RolesGuard`, `JwtStrategy`        | Autorización por rol (`Roles` decorator) y autenticación por JWT.               |
| ORM / Repository         | Prisma Client (tipado)                             | No repos custom; servicios consumen Prisma directamente (pattern “Service+ORM”).|
| Config / Environment     | `.env` + Nest config                               | Variables consumidas en bootstrap y Prisma.                                    |
| Manejo de errores        | Excepciones Nest (`NotFoundException`, `BadRequestException`) | Mapean a HTTP status coherente.                                          |

---

## Estructura del proyecto y jerarquía de carpetas

```
backend/
├─ src/
│  ├─ main.ts                 # Bootstrap Nest, CORS, prefijo /api
│  ├─ app.module.ts           # Módulo raíz: importa Auth, Users, Tasks, Flows, Prisma
│  ├─ prisma/
│  │   ├─ prisma.module.ts    # Proveedor del PrismaService
│  │   └─ prisma.service.ts   # Cliente Prisma inyectable
│  ├─ auth/                   # Login/Register, JWT strategy, guards y DTOs
│  ├─ common/                 # Decorators (CurrentUser), Roles decorator, RolesGuard
│  ├─ users/                  # CRUD de usuarios, perfil, unidades líderes
│  ├─ tasks/                  # Tareas, subtareas, problemas, historial, alerts, workload
│  ├─ flows/                  # Plantillas, instancias, etapas y cálculo de progreso
│  └─ ...                     # Tests e2e opcionales
├─ prisma/
│  ├─ schema.prisma           # Modelo de datos
│  ├─ migrations/             # Historial de migraciones
│  └─ seed.ts                 # Seed idempotente
├─ dist/                      # Artefactos de build (Nest)
├─ package.json
└─ .env.example               # Referencia de variables
```

Jerarquía lógica:
- `auth`: autenticación y emisión de JWT.
- `common`: utilidades cross-cutting (decorators/guards).
- `users`: gestión de usuarios y perfil; relación con unidades.
- `tasks`: núcleo operativo (tareas, estados, subtareas, problemas, historial).
- `flows`: diseño e instanciación de procesos; etapas ligadas a tareas.
- `prisma`: acceso a datos centralizado.

---

## Modelo de datos (Prisma)

| Entidad            | Propósito                                                   |
| ------------------ | ----------------------------------------------------------- |
| `User`             | Perfil, rol, unidad, meta (title, phone, about), avatarColor |
| `Role` / `RolePermission` | Control de acceso por clave `RoleKey`                 |
| `Unit`             | Jerarquía (parent/children) y líder (`leadId`)              |
| `Task`             | Prioridad, estado, dependencias, subtareas, tags, problemas, history |
| `TaskProblem`      | Bloqueos reportados, con `resolution` y `resolvedAt`        |
| `TaskHistory`      | Bitácora de acciones por tarea                              |
| `FlowTemplate`     | Plantillas con etapas (`FlowStage`)                         |
| `FlowInstance`     | Instancias de plantilla; dueño por unidad; `health`, progreso |
| `FlowStageStatus`  | Estado/progreso por etapa; relaciona tareas (`stageStatusId`) |
| `Notification`     | Asociable a usuario/tarea/flujo                             |

Enums clave:
- `RoleKey`: ADMIN | DESIGNER | FUNCTIONARY
- `TaskStatus`: PENDING | IN_PROGRESS | BLOCKED | COMPLETED | RETURNED
- `TaskPriority`: LOW | MEDIUM | HIGH | CRITICAL
- `FlowHealth`: ON_TRACK | AT_RISK | DELAYED

### Modelo relacional (vista simplificada)

```mermaid
erDiagram
  Role ||--o{ RolePermission : has
  Role ||--o{ User : assigns
  User ||--o| Unit : belongs_to
  Unit ||--|{ User : has
  Unit ||--o{ FlowInstance : owns
  Unit ||--o| Unit : parent

  FlowTemplate ||--o{ FlowStage : includes
  FlowTemplate ||--o{ FlowInstance : instanced_as
  FlowStage ||--o{ FlowStageStatus : tracked_in
  FlowInstance ||--o{ FlowStageStatus : has
  FlowInstance ||--o{ Notification : generates

  User ||--o{ FlowStageStatus : owns
  User ||--o{ Task : assigns
  User ||--o{ Task : owns

  FlowInstance ||--o{ Task : contains
  FlowStageStatus ||--o{ Task : groups
  Task ||--o{ SubTask : has
  Task ||--o{ TaskProblem : raises
  Task ||--o{ TaskHistory : logs
  Task ||--o{ TaskTag : tags
  Task ||--o{ TaskDependency : links
```

Claves destacadas:
- `User.roleId -> Role.id`, `User.unitId -> Unit.id`, `Unit.leadId -> User.id`.
- `Task.flowInstanceId -> FlowInstance.id`, `Task.stageStatusId -> FlowStageStatus.id`.
- `FlowStageStatus.instanceId -> FlowInstance.id`, `FlowStageStatus.stageId -> FlowStage.id`, `FlowStage.templateId -> FlowTemplate.id`.
- `FlowInstance.ownerUnitId -> Unit.id`, `FlowTemplate.ownerId -> User.id`.

---

## Relaciones, cascadas y reglas de negocio

- `Task.stageStatusId` → `FlowStageStatus.id` (SET NULL on delete). Agrupa tareas por etapa de instancia.
- Eliminación segura de plantillas/instancias: se limpian tags, historial, problemas, subtareas, dependencias, notificaciones y tareas antes de borrar `FlowStageStatus`, `FlowInstance`, `FlowStage`. Evita violar FK con `TaskProblem`.
- `Unit` jerárquica mediante `parentId`; líder mediante `leadId`.
- Perfil de usuario: campos opcionales persistentes `title`, `phone`, `about`, `avatarColor`.

---

## Cálculo de progreso (tareas → etapas → flujos)

- **Tarea:** `progress` 0-100 definido por el usuario; estado independiente.
- **Etapa (`FlowStageStatus`):** promedio del `progress` de sus tareas (solo 100% si todas las tareas están al 100%).  
  - Estado: PENDING (sin tareas o 0), IN_PROGRESS (avance > 0), BLOCKED (si alguna tarea está bloqueada), COMPLETED (100%).
- **Flujo (`FlowInstance`):** promedio del progreso de las etapas; 100% solo si todas están al 100%.  
  - Estado derivado: `no_iniciado` (sin avance), `en_progreso` (cualquier avance), `terminada` (todas las etapas completas).
- **Salud (`FlowHealth`):** ON_TRACK, AT_RISK (bloqueos), DELAYED (tareas no completadas y vencidas).

---

## Variables de entorno

| Clave                   | Descripción                                    | Ejemplo                                                                 |
| ----------------------- | ---------------------------------------------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`          | Cadena PostgreSQL (Render requiere `sslmode`)  | `postgresql://user:pass@host:5432/db?sslmode=require`                   |
| `JWT_SECRET`            | Llave para firmar JWT                          | `super-secret-key`                                                      |
| `PORT`                  | Puerto HTTP                                    | `4000`                                                                  |
| `DEFAULT_USER_PASSWORD` | Password por defecto para seeds/creación directa | `Process123*`                                                         |

---

## Comandos y scripts

```bash
# instalar dependencias
npm install

# generar cliente Prisma
npx prisma generate

# aplicar migraciones
npx prisma migrate deploy   # producción
npx prisma migrate dev      # desarrollo (crea nueva migración si hay cambios)

# seed idempotente
npx prisma db seed

# desarrollo
npm run start:dev

# build + producción
npm run build
npm run start:prod
```

---

## API y endpoints clave (prefijo `/api`)

Auth  
- `POST /auth/login` → `{ accessToken, user }`
- `POST /auth/register`

Público  
- `GET /public/options` → roles + unidades (para formularios de front).

Usuarios / Unidades (JWT)  
- `GET /users`, `GET /users/:id`, `POST /users` (ADMIN), `PATCH /users/:id`, `DELETE /users/:id`  
- `PATCH /users/profile` (usuario actual)  
- `GET /roles`, `GET /units`, `POST /units`, `PATCH /units/:id`, `DELETE /units/:id`

Tareas (JWT)  
- `POST /tasks`, `GET /tasks`, `GET /tasks/:id`  
- `PATCH /tasks/:id`, `PATCH /tasks/:id/status` (estado + progress)  
- `POST /tasks/:id/problems`, `PATCH /tasks/problems/:problemId/resolve`  
- `POST /tasks/:id/subtasks`, `GET /tasks/alerts`, `GET /tasks/workload/summary`

Flujos (JWT; roles ADMIN/DESIGNER)  
- `POST /flows/templates`, `GET /flows/templates`, `PATCH /flows/templates/:id`, `DELETE /flows/templates/:id`  
- `POST /flows/instances` (acepta `stageTasks` por etapa), `GET /flows/instances`, `DELETE /flows/instances/:id`  
- `PATCH /flows/instances/:instanceId/stages/:stageId` (estado/progreso de etapa)  
- `GET /flows/dashboard`

---

## Contratos DTO (resumen)

| DTO                         | Campos clave                                              |
| --------------------------- | --------------------------------------------------------- |
| `CreateTaskDto`             | `title`, `description`, `priority`, `ownerId`, `assignerId`, `deadline`, `flowInstanceId?`, `stageStatusId?`, `tags?`, `subTasks?` |
| `UpdateTaskStatusDto`       | `status`, `progress?`                                     |
| `ReportProblemDto`          | `description`                                             |
| `ResolveProblemDto`         | `resolution?`                                             |
| `CreateFlowTemplateDto`     | `name`, `description`, `businessObjective`, `typicalDurationDays`, `ownerId`, `stages[]` |
| `CreateFlowInstanceDto`     | `templateId`, `name`, `ownerUnitId`, `kickoffDate`, `dueDate`, `stageTasks[]` |
| `UpdateStageStatusDto`      | `status`, `progress?`, `ownerId?`                         |

---

## Migraciones y seed

Ubicación: `prisma/migrations/` (histórico) + `prisma/seed.ts`.

Migraciones recientes relevantes:
- `add_task_stage_link` (20251202000000): `stageStatusId` en `Task`; relación con `FlowStageStatus`.
- `add_profile_meta`: `title`, `phone`, `about` en `User`.
- `add_problem_resolution`: `resolution` en `TaskProblem`.

Seed (`npx prisma db seed`) crea:
- Roles y permisos base.
- Unidades demo (Operaciones, Finanzas, Tecnología, Calidad).
- Usuarios demo: Gabriela (ADMIN), Joaquín (DESIGNER), María (FUNCTIONARY) con password `Process123*`.
- Plantilla “Onboarding Cliente” con etapas.
- Instancia “Onboarding Cliente Kora” con etapas y tareas ligadas.

---

## Despliegue en Render

| Paso                | Acción                                                                 |
| ------------------- | ---------------------------------------------------------------------- |
| Variables           | `DATABASE_URL`, `JWT_SECRET`, `PORT=4000` (o el que definas).          |
| Build command       | `npm install && npm run build` (puedes añadir `npx prisma generate`).  |
| Start command       | `npm run start:prod`                                                   |
| Hook recomendado    | Antes de start: `npx prisma migrate deploy && npx prisma db seed`      |
| Salud inicial       | Render Free puede “dormir”; primera llamada puede tardar ~50s.         |

URL típica: `https://process-sa-back.onrender.com/api`

---

## Seguridad y buenas prácticas

- **JWT:** siempre en `Authorization: Bearer <token>`. No loguear secretos.  
- **CORS:** habilitado; restringir orígenes conocidos en producción.  
- **Passwords:** bcrypt. No reutilizar `JWT_SECRET` de dev.  
- **Roles/guards:** controllers de flujos y usuarios protegidos por `RolesGuard`.  
- **Datos demo:** seed idempotente; no usar en producción sin ajustes.  
- **Fallas de red/Render frío:** maneja reintentos o warming (primera llamada puede ser lenta).  

---

## Manual de usuario (API)

| Caso de uso                 | Endpoint / Acción                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------ |
| Obtener opciones iniciales  | `GET /public/options` → roles + unidades (para formularios de registro/front).       |
| Autenticarse                | `POST /auth/login` con `email/password` → `{ accessToken, user }`.                   |
| Usuarios                    | CRUD: `GET/POST/PATCH/DELETE /users` (ADMIN); `PATCH /users/profile` (propio).       |
| Unidades                    | `GET /units`, `POST /units`, `PATCH /units/:id`, `DELETE /units/:id`.                |
| Flujos (plantillas)         | `POST /flows/templates`, `GET /flows/templates`, `PATCH /flows/templates/:id`, `DELETE /flows/templates/:id`. |
| Flujos (instancias)         | `POST /flows/instances` (con `stageTasks`), `GET /flows/instances`, `DELETE /flows/instances/:id`. |
| Etapas de instancia         | `PATCH /flows/instances/:instanceId/stages/:stageId` (estado/progreso).              |
| Tareas                      | `POST/GET /tasks`, `GET /tasks/:id`, `PATCH /tasks/:id`, `PATCH /tasks/:id/status`.  |
| Problemas (bloqueos)        | `POST /tasks/:id/problems`, `PATCH /tasks/problems/:problemId/resolve`.              |
| Subtareas                   | `POST /tasks/:id/subtasks`.                                                          |
| Alertas y workload          | `GET /tasks/alerts`, `GET /tasks/workload/summary`.                                  |

## Manual de mantenimiento (API)

| Tarea                        | Paso práctico                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| Cambiar conexión BD          | Actualizar `DATABASE_URL` en `.env`; correr `npx prisma generate`; `npm run build`.  |
| Aplicar migraciones          | `npx prisma migrate deploy` (prod) o `npx prisma migrate dev` (dev).                 |
| Regenerar tipos Prisma       | `npx prisma generate`.                                                               |
| Añadir campo a un modelo     | Editar `prisma/schema.prisma` → `npx prisma migrate dev` → ajustar DTO/servicios.    |
| Añadir endpoint              | Crear DTO + controller + service; añadir guard/roles; actualizar `AppContext` en front. |
| Semillas                     | `npx prisma db seed` (idempotente).                                                  |
| Depuración en Render         | Revisar logs; validar `JWT_SECRET`, `DATABASE_URL`; primer hit puede tardar (cold start). |
| Build local                  | `npm run build`; corrige errores TS (suele ser falta de tipos/migraciones).          |

---

## Guía de smoke tests

1) `GET /public/options` devuelve roles y unidades.  
2) `POST /auth/login` con `gabriela@processsa.com` / `Process123*` devuelve token.  
3) `GET /tasks` con token devuelve tareas demo.  
4) `GET /flows/instances` muestra instancias con `progress` y `stageStatuses`.  
5) `PATCH /tasks/:id/status` recalcula progreso de etapa y flujo.  
6) `DELETE /flows/templates/:id` limpia tareas/etapas/instancias relacionadas sin errores de FK.  

---

## Troubleshooting rápido

| Síntoma                                         | Causa común                                           | Solución                                           |
| ----------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| `P1001 Can't reach database server`             | `DATABASE_URL` incorrecta / Render DB dormida         | Verifica cadena y `sslmode=require`; reintentar.   |
| Error TS al hacer build                         | Falta migración o tipo generado                       | `npx prisma generate && npx prisma migrate deploy` |
| No borra instancias por FK `TaskProblem`        | Versión antigua sin cascada                           | Actualiza código y corre migraciones nuevas.       |
| Progreso de flujo no cambia                     | Tareas sin `stageStatusId` o `progress` en 0          | Asegura `stageStatusId` y `progress` > 0 en tareas.|

---

## Extensiones y roadmaps sugeridos

- **Auditoría y logs**: interceptor para request/response, correlación de IDs, almacenamiento en tabla de auditoría.
- **Cache / CDN**: endpoints de catálogos (`public/options`) con cache HTTP y control de ETags.
- **Notificaciones push/email**: hook post-cambio de estado de tarea/flujo para enviar correo o webhook.
- **Reportes avanzados**: endpoints agregados para métricas por unidad, SLA y productividad (usar `groupBy` de Prisma).
- **Multilenguaje**: parametrizar textos en backend para front multi-idioma.
- **Health checks**: `GET /health` con chequeo de DB y tiempo de respuesta.

---

## Convenciones de estilo y calidad

- **Lint/format**: usa `npm run lint` (si se agrega ESLint) y formateo consistente (Prettier opcional).
- **DTO claros**: cada controller debe validar DTO; no aceptar `any`.
- **Errores explícitos**: usar excepciones Nest (`BadRequestException`, `NotFoundException`, etc.).
- **Tipado Prisma**: preferir selects para no sobrecargar responses; evitar `include` innecesario.
- **Nombre de migraciones**: prefijo con fecha y propósito (`YYYYMMDDHHmmss_descripcion`).
- **Tests**: para lógica crítica (progreso, cascadas), agregar e2e o unit tests en `test/`.

---

## FAQ corta

| Pregunta                                      | Respuesta                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| ¿Dónde cambio la DB?                          | En `.env` (`DATABASE_URL`).                                               |
| ¿Por qué el progreso queda en 0%?             | Las tareas no tienen `stageStatusId` o `progress`; asigna ambos.          |
| ¿Por qué no puedo borrar una instancia?       | Hay problemas (`TaskProblem`) ligados; ya manejado en cascada con código reciente. |
| ¿Cómo agrego un nuevo rol?                    | Agrega `RoleKey`, seed, permisos y ajusta guards; actualiza front types.  |
| ¿Cómo probar rápido en local?                 | `npm run start:dev` + `npx prisma migrate dev` + `npx prisma db seed`.    |


## Próximos pasos y escalabilidad

- **Arquitectura hexagonal**: separar dominio/aplicación de infraestructura (Prisma/Nest) para testing aislado y menor acoplamiento.
- **Microservicios / BFF**: dividir en BFF para front (agregación) + servicios por dominio (users, tasks, flows). API gateway opcional.
- **Modularización por feature**: empaquetar dominios en módulos aislables (mono-repo) con migraciones propias.
- **Mensajería/eventos**: publicar eventos de dominio (tarea actualizada, flujo completado) en un bus (SNS/SQS, Kafka) para notificaciones/reportes desacoplados.
- **AWS escalable**: contenedores en ECS/EKS o serverless (Lambda), BD en RDS, caché en ElastiCache; CI/CD con migraciones automatizadas.
- **Observabilidad**: tracing distribuido (OpenTelemetry), métricas (Prometheus/Grafana), alertas sobre SLIs.
- **Seguridad avanzada**: rotación de secretos (Secrets Manager), WAF, rate limiting por IP/tenant, políticas de menor privilegio.

Comparativa de roadmap vs PDF: el documento pedía capas separadas, posibles módulos de escritorio/móvil, PL/SQL y reportes PDF. Nuestro camino propuesto moderniza el stack hacia hexagonal + microservicios + cloud (AWS) manteniendo principios de separación y escalabilidad, sustituyendo PL/SQL por Prisma/Node y contemplando notificaciones y observabilidad modernas.

## Próximos pasos y escalabilidad

- **Arquitectura hexagonal**: separar dominio/aplicación de infraestructura (Prisma/Nest) para testing aislado y menor acoplamiento.
- **Microservicios / BFF**: dividir en BFF para front (agregación) + servicios por dominio (users, tasks, flows). API gateway opcional.
- **Modularización por feature**: empaquetar dominios en módulos aislables (mono-repo) con migraciones propias.
- **Mensajería/eventos**: publicar eventos de dominio (tarea actualizada, flujo completado) en un bus (SNS/SQS, Kafka) para notificaciones/reportes desacoplados.
- **AWS escalable**: contenedores en ECS/EKS o serverless (Lambda), BD en RDS, caché en ElastiCache; CI/CD con migraciones automatizadas.
- **Observabilidad**: tracing distribuido (OpenTelemetry), métricas (Prometheus/Grafana), alertas sobre SLIs.
- **Seguridad avanzada**: rotación de secretos (Secrets Manager), WAF, rate limiting por IP/tenant, políticas de menor privilegio.
Mantenedor: Equipo Process SA. Para cambios de modelo, actualiza `schema.prisma`, genera migración y ajusta DTOs/servicios correspondientes.***
