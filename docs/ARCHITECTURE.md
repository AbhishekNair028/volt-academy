# Volt Academy: architecture

## Layout
apps/web (React, Vite, R3F) | apps/api (Express, Prisma) | packages/sim (physics, scoring, coach) | packages/shared (Zod schemas, types)

## Data access
The web app talks to one `VoltApi` interface. `RealApi` calls `/api/v1`. `DemoApi` uses IndexedDB with seeded data. `VITE_API_MODE` picks one at build time, so GitHub Pages works with no server.

## ER diagram
```mermaid
erDiagram
  users ||--o{ refresh_tokens : has
  users ||--o{ vehicles : owns
  users ||--o{ lesson_attempts : makes
  users ||--o{ user_badges : earns
  users ||--o{ trips : plans
  users ||--o{ notifications : receives
  users ||--o{ audit_logs : causes
  users ||--o{ classes : teaches
  users ||--o{ class_members : joins
  classes ||--o{ class_members : has
  classes ||--o{ assignments : sets
  lessons ||--o{ assignments : in
  lessons ||--o{ lesson_attempts : for
  lesson_attempts ||--|| telemetry_runs : records
  lesson_attempts ||--o{ comments : gets
  badges ||--o{ user_badges : awarded
  trips }o--o{ chargers : stops
```

## API groups (/api/v1)
Errors: `{ error: { code, message, details?, requestId? } }`. Lists: `?page=&pageSize=` returning `{ items, page, pageSize, total }`.

| Group | Routes |
|---|---|
| auth | POST register, login, logout, refresh, forgot, reset, verify |
| users | GET/PATCH me; GET/PATCH me/settings |
| vehicles | CRUD /vehicles |
| lessons | GET /lessons, /lessons/:slug |
| attempts | POST /attempts, GET /attempts, GET /attempts/:id |
| telemetry | PUT /attempts/:id/telemetry, GET /attempts/:id/telemetry, GET /lessons/:slug/ghost |
| trips | POST /trips/plan, CRUD /trips |
| chargers | GET /chargers?bbox= |
| classes | CRUD /classes, POST /classes/join, GET /classes/:id/analytics |
| assignments | POST/GET /classes/:id/assignments |
| comments | POST/GET /attempts/:id/comments |
| admin | users, lessons CRUD, audit-logs |
| analytics | GET /analytics/me, /analytics/platform |

Roles: LEARNER, INSTRUCTOR (own classes only), ADMIN (all).

## Telemetry storage
Runs are stored as one row with parallel Float32 arrays packed into a gzip'd JSON blob (about 30 KB for 10 min at 10 Hz), plus indexed summary columns on `lesson_attempts`.
