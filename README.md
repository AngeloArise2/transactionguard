# TransactionGuard

A real-time transaction anomaly detection system built with Java Spring Boot and Angular. Simulated banking transactions are ingested continuously, scored against each customer's rolling spending pattern, and flagged transactions are streamed live to a monitoring dashboard.

> **Note on data:** This project uses a simulated transaction generator, not a live bank feed. Amounts, merchants, and customers are synthetically generated (including deliberate anomalous spikes) to demonstrate the real-time detection and streaming pipeline end-to-end. This is stated plainly here rather than implied otherwise.

## Architecture

```
[Scheduled Generator] → [Transaction Service] → [Postgres]
                                ↓
                    [Anomaly Detection Service] ←→ [Redis: rolling avg per customer]
                                ↓ (if flagged)
                    [STOMP/WebSocket broker: /topic/flagged-transactions]
                                ↓
                    [Angular Dashboard: live feed + chart]
```

**Data flow, in one sentence:** a transaction is generated or submitted, persisted to Postgres, checked against a Redis-cached rolling average for that customer, flagged if it exceeds a threshold, and — if flagged — pushed instantly over WebSocket to any connected dashboard.

## Tech Stack

- **Backend:** Java 17, Spring Boot 4.0.7, Spring Data JPA, Spring Security (JWT), Spring WebSocket (STOMP over SockJS), Flyway
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **Frontend:** Angular 22 (standalone components, signals), RxJS, @stomp/stompjs, sockjs-client, Chart.js via ng2-charts
- **Infra (local):** Docker Compose for Postgres + Redis

## Why these choices

- **PostgreSQL over MySQL:** more common in fintech-adjacent backends; identical JPA integration.
- **Redis for the anomaly check:** the rolling average lookup happens on every transaction — caching it avoids a database aggregate query on the hot path, which matters if this were to scale beyond a demo.
- **STOMP/WebSocket over polling:** flagged transactions need to reach the dashboard the instant they occur, not after the next poll interval.
- **A statistical threshold rule over an ML model:** the detection logic (rolling average + multiplier threshold) is fully explainable — every flag has a clear, stated reason, which mirrors how real fraud systems often use simple rules as a first-pass filter.

## Prerequisites

- Java 17+
- Maven 3.9+
- Node.js 20+ (npm 10+)
- Docker + Docker Compose

## Running Locally (tested from a clean clone)

The whole system should be up in under 10 minutes. No `.env` file is required — every setting has a local-dev default (see [Environment Variables](#environment-variables) to customize).

1. **Start the infrastructure (Postgres + Redis):**

   ```bash
   docker compose up -d
   ```

   Verify both are healthy:

   ```bash
   docker ps --format "table {{.Names}}\t{{.Status}}"
   # transactionguard-postgres should show "healthy"
   # transactionguard-redis should show "healthy"
   ```

2. **Start the backend (applies Flyway migrations on startup):**

   ```bash
   cd backend
   mvn spring-boot:run
   ```

   Wait for `Started TransactionguardApplication` in the logs. The API is now on `http://localhost:8080`.

3. **Start the frontend:**

   ```bash
   cd frontend
   npm install
   npm start        # = ng serve, on http://localhost:4200
   ```

   `ng serve` proxies `/api` to the backend on `:8080`, so REST calls need no CORS setup. The WebSocket connects directly to `:8080/ws`, which the backend explicitly allows for the `localhost:4200` origin.

4. **Use it:**
   - Open http://localhost:4200, **register** a user, then **log in**.
   - Open **Transactions** — the page lists a seeded set of customers and their transactions.
   - Open **Dashboard** — within a few seconds the live feed starts showing flagged transactions as the generator (one every ~5s, with an occasional deliberate spike) scores them. The chart updates in place; no refresh needed.

## Verifying the pipeline manually

Everything flows through the same REST + WebSocket path, so you can drive it by hand too:

```bash
# 1. Log in (get a JWT)
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"youruser","password":"yourpassword"}'
# → {"token":"eyJ...","expiresAt":...}

# 2. Submit a transaction that is deliberately far above a customer's average.
#    Customer 2's baseline is typically tens of dollars, so $2000 is far enough
#    above the 3x threshold that it should come back flagged (unless a recent
#    spike has already inflated that customer's rolling average).
curl -s -X POST http://localhost:8080/api/transactions \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"customerId":2,"amount":2000.00,"merchant":"Manual Spike Check","category":"Test"}'
# → returns the transaction with "flagged": true (and a reason like
#    "Amount is 22.2x customer's rolling average") when the baseline is normal
```

The flagged transaction appears in the dashboard's live feed and chart within a second.

## Environment Variables

See `.env.example` for the full list. Summary:

| Variable | Used by | Default |
|---|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | docker-compose.yml, backend application.yml | `transactionguard`, `tg_user`, `tg_pass` |
| `DB_PORT` | backend application.yml (Postgres host port) | `5432` |
| `JWT_SECRET` | backend application.yml | dev-only fallback (fine locally, **do not ship**) |
| `REDIS_HOST`, `REDIS_PORT` | backend application.yml | `localhost`, `6379` |

- Docker Compose reads `.env` automatically if you create one (`cp .env.example .env`).
- The backend reads real environment variables; export them in your shell (or use direnv) for `mvn spring-boot:run` to pick them up. With nothing set, the defaults above work.
- Never commit a real `.env` — it's gitignored. Only `.env.example` is committed.

## API Overview

| Method | Endpoint | Auth required | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create a new user |
| POST | `/api/auth/login` | No | Log in, returns JWT |
| GET | `/api/customers` | Yes | List customers |
| POST | `/api/customers` | Yes | Create a customer |
| GET | `/api/transactions?customerId=` | Yes | List transactions for a customer |
| POST | `/api/transactions` | Yes | Create a transaction (triggers anomaly scoring) |
| WS | `/ws` (STOMP topic `/topic/flagged-transactions`) | — | Live feed of flagged transactions |

## What I'd improve with more time

- Replace the exponential-moving-average threshold with a slightly more robust statistical model (e.g., factoring in standard deviation, not just mean).
- Add integration tests around the anomaly scoring service.
- Move JWT storage to an httpOnly cookie rather than in-memory for better XSS resistance.
- Add pagination and filtering to the transaction list UI.
- Replace the in-memory STOMP simple broker with Redis pub/sub + an external broker (e.g., RabbitMQ) before scaling past a demo.
