# HPD Booking — Backend (NestJS + PostgreSQL)

REST API for the Hyde Park HPD Triple Play booking form.
Built with [NestJS](https://nestjs.com), [TypeORM](https://typeorm.io) and PostgreSQL.

## Prerequisites

- Node.js 18+
- A PostgreSQL database. The easiest way is the bundled Docker setup:

```bash
docker compose up -d        # starts Postgres on localhost:5432
```

## Setup

```bash
npm install
cp .env.example .env        # then adjust credentials if needed
npm run start:dev           # http://localhost:3000/api
```

On first start, TypeORM creates the tables (`DB_SYNCHRONIZE=true`) and the
`units` table is auto-seeded with the default unit codes.

## Environment

See [.env.example](.env.example). Key variables:

| Variable         | Default                 | Description                          |
| ---------------- | ----------------------- | ------------------------------------ |
| `PORT`           | `3000`                  | API port                             |
| `CORS_ORIGIN`    | `http://localhost:5173` | Allowed frontend origin(s), CSV      |
| `ADMIN_USERNAME` | `admin`                 | Admin login username                 |
| `ADMIN_PASSWORD` | `pass123`               | Admin login password                 |
| `JWT_SECRET`     | `dev-secret-change-me`  | Secret used to sign JWTs             |
| `JWT_EXPIRES_IN` | `1d`                    | JWT lifetime (e.g. `60s`, `30m`)     |
| `DB_HOST`        | `localhost`             | Postgres host                        |
| `DB_PORT`        | `5432`                  | Postgres port                        |
| `DB_USERNAME`    | `postgres`              | Postgres user                        |
| `DB_PASSWORD`    | `postgres`              | Postgres password                    |
| `DB_DATABASE`    | `hpd_booking`           | Database name                        |
| `DB_SYNCHRONIZE` | `true`                  | Auto-sync schema (dev only)          |

## API

Base path: `/api`

### Health
- `GET /api/health` → `{ status: "ok" }`

### Auth
- `POST /api/login` — verify admin credentials and return a JWT.
  - Body: `{ "username": "admin", "password": "pass123" }`
  - `200` → `{ "token": "eyJhbGciOi..." }`
  - `401` → `{ "statusCode": 401, "message": "Invalid username or password", ... }`

### Units
- `GET /api/units` — list active units (used by the dropdown)
- `POST /api/units` — add a unit `{ code, description?, isActive? }`

### Bookings
- `POST /api/bookings` — create a booking. **`multipart/form-data`**:
  - `unitCode`, `firstName`, `lastName`, `mobile`, `installationDate` (`YYYY-MM-DD`),
    `installationTime`, `agreedToTerms` (`true`/`false`), and a `receipt` file
    (JPEG/PNG/WEBP/PDF, max 10 MB).
- `GET /api/bookings?status=pending|confirmed|cancelled` — list bookings
- `GET /api/bookings/:id` — single booking
- `PATCH /api/bookings/:id/status` — `{ "status": "confirmed" }`
- `DELETE /api/bookings/:id` — delete a booking (and its receipt file)

Uploaded receipts are served from `/uploads/<filename>`.

### Quick test

```bash
curl -F unitCode=A-101 -F firstName=Mona -F lastName=Ali \
     -F mobile=01000000000 -F installationDate=2026-07-01 \
     -F "installationTime=10:00 AM" -F agreedToTerms=true \
     -F receipt=@/path/to/receipt.png \
     http://localhost:3000/api/bookings
```

## Data model

**units**: `id`, `code` (unique), `description`, `isActive`, `createdAt`

**bookings**: `id`, `unitCode`, `firstName`, `lastName`, `mobile`,
`receiptFilename`, `receiptOriginalName`, `receiptPath`, `installationDate`,
`installationTime`, `agreedToTerms`, `status`, `createdAt`, `updatedAt`
