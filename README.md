# Stock Market Suite (MVP)

Monorepo that scaffolds a Zerodha/Groww-style stock analysis + trading app:
- **Web**: Next.js (`apps/web`)
- **API**: NestJS + Prisma (`apps/api`)
- **Mobile**: Expo (`apps/mobile`)
- **Shared**: schemas + indicators (`packages/shared`)
- **Brokers**: Alpaca + Zerodha adapters (`packages/brokers`)

## Dev quickstart

### 1) Install
```bash
pnpm install
```

### 2) Start Postgres + Redis
```bash
docker compose up -d
```

### 3) Configure API env
Create `apps/api/.env` (copy from `apps/api/.env.example`) and set:
- `DATABASE_URL` (default works with docker compose)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `APP_ENCRYPTION_KEY` (32 bytes base64)
- `REDIS_URL` (default `redis://localhost:6379`)
- `BROKER_SANDBOX_MODE=true` for local/demo trading without external broker credentials

Generate a key:
```bash
node scripts/gen-encryption-key.cjs
```

### 4) Run migrations
```bash
pnpm -C apps/api exec prisma db push
```

### 5) Run dev
```bash
pnpm dev
```

Web: `http://localhost:3000`  
API: `http://localhost:3001` (Swagger: `http://localhost:3001/docs`)

## Background workers
- Alert evaluation jobs are queued in BullMQ queue `alert-eval`.
- Push notification jobs are queued in `notifications`.
- The API schedules recurring alert evaluation every `ALERT_EVAL_INTERVAL_MS` (default 60s).

### Notification endpoints
- `POST /notifications/device/register` to register Expo push token.
- `GET /notifications/inbox` to fetch in-app alert events.

## Tests
- Unit/integration bundle:
```bash
pnpm test
```
- API E2E trading flow (requires `DATABASE_URL` + Redis):
```bash
pnpm -C apps/api test:e2e
```

## CI/CD
GitHub Actions workflows are in `.github/workflows`:
- `ci.yml`: install, build, lint, test, api e2e.
- `deploy-web-vercel.yml`: deploys web app to Vercel.
- `deploy-api-render.yml`: triggers Render deploy hook.
- `deploy-api-fly.yml`: deploys API to Fly.io.

Required GitHub secrets:
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_WEB`
- `RENDER_DEPLOY_HOOK_API`
- `FLY_API_TOKEN`

## Notes
- India instruments: store `id` like `NSE:INFY` and include `metadata.instrumentToken` for candles.
- MFA: for API sign-in, MFA code is accepted via `x-mfa-code` header; the web UI handles this.
- Real-time watchlist quotes: web uses Socket.IO at `API_BASE_URL` with path `/ws`.
- Expo push notifications are delivered via `https://exp.host/--/api/v2/push/send`.
