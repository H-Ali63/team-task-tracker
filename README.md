# Team Task Tracker

A production-grade full-stack task management system built for the SDE II take-home assignment. Features JWT authentication with refresh token rotation, role-based access control, enforced status transitions, Redis caching, real-time WebSocket notifications, and full Docker deployment.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [API Documentation](#api-documentation)
- [Authentication Design](#authentication-design)
- [RBAC Design](#rbac-design)
- [Status Transition System](#status-transition-system)
- [Database Schema & Indexing Decisions](#database-schema--indexing-decisions)
- [Redis Caching Strategy](#redis-caching-strategy)
- [Cache Invalidation Strategy](#cache-invalidation-strategy)
- [Real-time Notifications](#real-time-notifications)
- [Frontend Features](#frontend-features)
- [Testing](#testing)
- [Future Improvements](#future-improvements)

---

## Quick Start

### Prerequisites
- Docker and Docker Compose installed

### Run the entire system

```bash
git clone <repo-url>
cd team-task-tracker
docker compose up --build
```

That's it. No manual setup required.

| Service  | URL                          |
|----------|------------------------------|
| Frontend | http://localhost:3000        |
| Backend  | http://localhost:5000        |
| API Docs | http://localhost:5000/api/docs |
| Health   | http://localhost:5000/api/v1/health |

### First-time use

1. Open http://localhost:3000/register
2. Enter your name, email, password, and an **Organization Name** (you'll be assigned ADMIN)
3. Share your Organization ID with teammates — they register with that ID to join as MEMBER
4. Admins can promote members to MANAGER via the Users page

### Run locally without Docker (development)

```bash
# Backend
cd backend
cp .env.example .env   # Update MONGO_URI and REDIS_HOST to localhost
npm install
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Deploy on Render + Vercel

Set these environment variables in the hosting dashboards:

**Render backend**
```bash
CORS_ORIGINS=https://your-frontend.vercel.app
REDIS_URL=redis://default:password@red-example:6379
```

Use `REDIS_URL` for Render Redis connection strings. `REDIS_HOST` should only be used when you have a plain hostname such as `redis`.

Use a comma-separated list if you also want local or preview origins:

```bash
CORS_ORIGINS=http://localhost:3000,https://your-frontend.vercel.app,https://*.vercel.app
```

**Vercel frontend**
```bash
VITE_API_URL=https://your-backend.onrender.com/api/v1
```

---

## Architecture Overview

```
team-task-tracker/
├── backend/                    # Node.js + Express API
│   └── src/
│       ├── config/             # DB and Redis connections
│       ├── constants/          # Roles, statuses, error codes
│       ├── models/             # Mongoose schemas
│       ├── repositories/       # Data access layer (BaseRepository pattern)
│       ├── services/           # Business logic layer
│       ├── controllers/        # HTTP request/response handling
│       ├── middlewares/        # Auth, RBAC, validation, error handler
│       ├── routes/             # Express router definitions
│       ├── validations/        # Joi schemas
│       ├── cache/              # Redis cache service + key builders
│       ├── utils/              # Logger, asyncHandler, JWT helpers, etc.
│       ├── swagger/            # OpenAPI spec config
│       ├── docs/               # YAML route documentation
│       └── __tests__/          # Jest + Supertest integration tests
├── frontend/                   # React + Vite + Tailwind CSS
│   └── src/
│       ├── api/                # Axios instance with interceptors
│       ├── store/              # Zustand state management + persistence
│       ├── services/           # API call wrappers
│       ├── context/            # Socket.IO context
│       ├── components/         # Reusable UI components
│       ├── pages/              # Route-level page components
│       ├── layouts/            # DashboardLayout with sidebar + navbar
│       ├── routes/             # Protected/public route wrappers
│       └── utils/              # Constants, formatters, helpers
└── docker-compose.yml          # Orchestrates all 4 services
```

### Key Architectural Decisions

**Modular Monolith** — A clean layered architecture was chosen over microservices. For a team task tracker at this scale, microservices would add operational overhead with no meaningful benefit. The layers (repository → service → controller) make the code independently testable and easy to extract if needed later.

**Repository Pattern** — All database access goes through repository classes that extend a `BaseRepository`. Controllers never touch Mongoose directly. This decouples business logic from the persistence layer and makes unit testing trivial.

**Service Layer for Business Logic** — All domain logic (status transitions, permission checks, cache management) lives in the service layer. Controllers only handle HTTP concerns: parse request → call service → send response.

**RBAC via Middleware** — Role checks are never inside controllers. The `authorize(...roles)` middleware is composed at the route level, keeping controllers clean and RBAC logic centralised.

---

## API Documentation

Full interactive Swagger UI is available at **http://localhost:5000/api/docs**

### Endpoints Summary

#### Auth (`/api/v1/auth`)
| Method | Path         | Auth | Description                    |
|--------|--------------|------|--------------------------------|
| POST   | /register    | No   | Register + create/join org     |
| POST   | /login       | No   | Login, get token pair          |
| POST   | /refresh     | No   | Rotate refresh token           |
| POST   | /logout      | Yes  | Revoke refresh token           |
| GET    | /me          | Yes  | Get current user               |

#### Tasks (`/api/v1/tasks`)
| Method | Path              | Roles              | Description                |
|--------|-------------------|--------------------|----------------------------|
| GET    | /                 | All                | List tasks (paginated)     |
| POST   | /                 | ADMIN, MANAGER     | Create task                |
| GET    | /analytics        | ADMIN, MANAGER     | Overdue + completion stats |
| GET    | /:id              | All                | Get task details           |
| PUT    | /:id              | ADMIN, MANAGER     | Update task fields         |
| PATCH  | /:id/status       | Assignee or MANAGER| Update status              |
| DELETE | /:id              | ADMIN, MANAGER     | Delete task                |

#### Users (`/api/v1/users`)
| Method | Path         | Roles          | Description         |
|--------|--------------|----------------|---------------------|
| GET    | /profile     | All            | Own profile         |
| GET    | /            | ADMIN, MANAGER | List org users      |
| GET    | /:id         | ADMIN, MANAGER | Get user by ID      |
| PATCH  | /:id/role    | ADMIN          | Change user role    |
| DELETE | /:id         | ADMIN          | Deactivate user     |

---

## Authentication Design

JWT-based with a two-token approach:

- **Access Token** — Short-lived (15 min), stateless, sent as `Authorization: Bearer <token>`
- **Refresh Token** — Long-lived (7 days), stored in MongoDB per user, rotated on every use

### Refresh Token Rotation

On each `/auth/refresh` call:
1. The incoming refresh token is verified against the DB record
2. The old token is marked as **revoked**
3. A new access + refresh token pair is issued
4. If a revoked token is reused (replay attack), **all** of the user's refresh tokens are immediately revoked, forcing a full re-login

### Password Security

- bcrypt with 12 salt rounds
- Passwords are never returned in any API response (`select: false` on schema)
- Constant-time comparison via `bcrypt.compare` prevents timing attacks

---

## RBAC Design

RBAC is enforced **exclusively at the middleware layer**. No role checks appear in controllers.

```javascript
// Route definition — role check is declarative and clear
router.post('/tasks',
  authenticate,           // Verifies JWT, attaches req.user
  authorize('ADMIN', 'MANAGER'),  // Checks req.user.role
  validate(createTaskSchema),
  taskController.createTask
);
```

The `authorize(...roles)` factory returns a middleware that rejects with 403 if the user's role is not in the allowed list.

| Role    | Create Tasks | Assign Members  | Update Any Status  | Manage Users  | View All Tasks  |
|---------|:------------:|:---------------:|:------------------:|:-------------:|:---------------:|
| ADMIN   | ✓            | ✓              | ✓                 | ✓              | ✓              |
| MANAGER | ✓            | ✓              | ✓                 | ✗              | ✓              |
| MEMBER  | ✗            | ✗              | Own tasks only    | ✗              | Own tasks only |

Organization scoping is enforced via the `scopeToOrganization` middleware, which attaches `req.organizationId` from the authenticated user. All queries are automatically filtered to the user's org — users cannot see or modify data from other organizations.

---

## Status Transition System

Status changes follow a strict finite state machine enforced in the **service layer** (not the DB, not the controller):

```
TODO ──────→ IN_PROGRESS ──────→ IN_REVIEW ──────→ DONE
  ↘               ↘                  ↘
          BLOCKED (from any active state)
```

**Terminal states:** `DONE` and `BLOCKED` have no outgoing transitions. DONE tasks cannot be reopened (by design — this mirrors real-world workflows and prevents data corruption).

**Who can change status:** Only the task's assignee OR a user with MANAGER/ADMIN role. This check happens in the service layer after the middleware has already verified authentication and org scope.

When a task transitions to `DONE`, a `completedAt` timestamp is automatically set via a Mongoose pre-save hook. This is used by the analytics endpoint to compute average completion time.

---

## Database Schema & Indexing Decisions

### Collections

**Organization**
```
{ name, slug (unique), description, isActive, timestamps }
```

**User**
```
{ name, email (unique), password (hidden), role, organizationId (ref), isActive, refreshTokens[], timestamps }
```

**Task**
```
{ title, description, priority, status, assignee (ref User), dueDate, organizationId (ref), createdBy (ref User), completedAt, timestamps }
```

### Index Design Rationale

Single-field indexes are created on `status`, `assignee`, and `dueDate` as required by the assignment. Beyond that, compound indexes are the primary performance investment:

| Index | Query it serves | Why |
|-------|----------------|-----|
| `{ organizationId: 1, status: 1 }` | List tasks by status within org | Most common admin/manager filter |
| `{ organizationId: 1, assignee: 1, status: 1 }` | Member task list | Covers the MEMBER-scoped query in one index scan |
| `{ organizationId: 1, dueDate: 1, status: 1 }` | Overdue analytics aggregation | Avoids a full collection scan on the aggregation pipeline |
| `{ organizationId: 1, createdAt: -1 }` | Default sort (newest first) | Covered index for the default list query |

**Design decision:** The `{ organizationId, assignee, status }` compound index was the most deliberate choice. Since MEMBER-role queries always filter on all three fields simultaneously, this index means MongoDB never touches documents outside the relevant assignee's org scope. For multi-tenant SaaS this is critical — without it, a large organization's task list would degrade linearly as task count grows.

---

## Redis Caching Strategy

Cache is applied to task list queries — the most frequently hit, read-heavy endpoint.

**What is cached:**
- Task lists per assignee: `tasks:org:{orgId}:assignee:{userId}`
- General task list queries (by filter hash): `tasks:org:{orgId}:query:{hash}`
- The hash is a base64 encoding of the filter/sort/pagination parameters

**Cache flow:**
```
Request → Check Redis key → HIT: return cached JSON
                          → MISS: query MongoDB → store in Redis (TTL: 5min) → return
```

**Graceful degradation:** All Redis operations are wrapped in try/catch. If Redis is down, the system falls through to MongoDB without crashing. Caching is non-critical infrastructure.

**TTL:** 5 minutes (configurable via `CACHE_TTL` env var). This balances freshness with performance. For a task tracker, slightly stale list data (a task appearing in-progress for 5 extra minutes) is acceptable.

---

## Cache Invalidation Strategy

Cache is invalidated eagerly on any write operation:

| Event            | Invalidation scope                                |
|------------------|---------------------------------------------------|
| Task created     | All `tasks:org:{orgId}:*` keys                    |
| Task updated     | All `tasks:org:{orgId}:*` keys + old assignee key |
| Task deleted     | All `tasks:org:{orgId}:*` keys                    |
| Status changed   | All `tasks:org:{orgId}:*` keys + assignee key     |
| Assignee changed | Old assignee key + new assignee key               |

The `invalidateTaskCaches(orgId, assigneeId?)` helper uses Redis `KEYS` pattern matching to bulk-delete all query-hash variants for an org in a single operation. This avoids stale data from multiple concurrent filter combinations being served after a write.

**Trade-off acknowledged:** Pattern-based key deletion (`KEYS tasks:org:*`) blocks Redis momentarily for orgs with many cached variants. At very high scale (10k+ concurrent users per org), this should be replaced with a Redis Set tracking active keys for O(1) targeted deletion. This is documented in [Future Improvements](#future-improvements).

---

## Real-time Notifications

Socket.IO is used for push notifications to task assignees. When a task's status is changed:

1. The service layer emits `task:status_changed` to the assignee's personal room (`user:{userId}`)
2. The frontend subscribes on login by emitting `subscribe` with the user's ID
3. The React context receives the event and displays a toast notification

This works across browser tabs and survives brief reconnects (Socket.IO handles reconnection automatically).

---

## Frontend Features

- **Authentication persistence** — Zustand store with `persist` middleware keeps tokens in `localStorage` across page reloads
- **Token refresh** — Axios interceptor catches 401 responses and transparently refreshes the token, queuing concurrent requests during refresh
- **Protected routes** — `ProtectedRoute`, `PublicRoute`, and `RoleProtectedRoute` wrappers handle all navigation guards
- **Role-based UI** — Sidebar nav items, action buttons (Create Task, Edit, Delete), and pages are conditionally rendered based on `user.role`
- **Task filters + pagination** — Status, priority, sort-by controls with server-side pagination
- **Loading states** — Spinners on all async operations; no flash of empty content
- **Error handling** — `getErrorMessage()` extracts the API error message for user-facing toasts
- **Real-time toasts** — Socket.IO events surface as toast notifications

---

## Testing

Integration tests cover the two most critical flows:

```bash
cd backend
npm test
```

**auth.test.js** — Tests register, login, refresh token rotation, token reuse detection
**tasks.test.js** — Tests status transitions, invalid transitions, RBAC enforcement on task endpoints

Tests use `mongodb-memory-server` for an in-memory MongoDB instance and mock Redis for isolation. No external services required.

---

## Future Improvements

Given more time, these are the highest-priority additions:

1. **Redis key tracking with Sets** — Replace `KEYS pattern` invalidation with a Redis Set per org tracking active cache keys. Eliminates the blocking `KEYS` call at scale.

2. **Rate limiting per user** — Current rate limiting is IP-based. Add per-user limits using the authenticated user ID as the rate limit key to prevent abuse from shared IPs.

3. **Soft-delete for tasks** — Add `deletedAt` timestamp instead of hard deletes. Enables audit trails, undo functionality, and analytics over deleted tasks.

4. **Email notifications** — Nodemailer or SendGrid integration to notify assignees when tasks are assigned or approaching their due date.

5. **Task comments/activity log** — An activity feed per task showing status changes, reassignments, and comments. Implement as a separate `Activity` collection with a reference to `taskId`.

6. **Cursor-based pagination** — Replace page/offset pagination with cursor-based for large datasets. Offset pagination degrades at high page numbers because MongoDB must skip N documents.

7. **Unit tests for service layer** — Current tests are integration tests. Pure unit tests for the service layer (mocking repositories) would run faster and test edge cases more precisely.

8. **CI/CD pipeline** — GitHub Actions workflow to run tests, build Docker images, and push to a container registry on merge to main.

9. **File attachments** — Allow attaching files to tasks via S3-compatible object storage (e.g. MinIO in development, S3 in production).

10. **Multi-project support** — Group tasks under projects within an organization. The schema is already prepared (organizationId exists) — add a `Project` collection and `projectId` on tasks.
