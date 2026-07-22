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

- **Backend:** Java 17, Spring Boot 3.x, Spring Data JPA, Spring Security (JWT), Spring WebSocket (STOMP), Flyway
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **Frontend:** Angular 17 (standalone components), RxJS, @stomp/stompjs, [ngx-charts / ng2-charts — confirm which was used]
- **Infra (local):** Docker Compose for Postgres + Redis

## Why these choices

- **PostgreSQL over MySQL:** more common in fintech-adjacent backends; identical JPA integration.
- **Redis for the anomaly check:** the rolling average lookup needs to happen on every transaction — caching it avoids a database aggregate query on the hot path, which matters if this were to scale beyond a demo.
- **STOMP/WebSocket over polling:** flagged transactions need to reach the dashboard the instant they occur, not after the next poll interval.
- **A statistical threshold rule over an ML model:** the detection logic (rolling average + multiplier threshold) is fully explainable — every flag has a clear, stated reason, which mirrors how real fraud systems often use simple rules as a first-pass filter.

## Prerequisites

- Java 17+
- Maven 3.9+
- Node.js 20+ and Angular CLI 17+
- Docker + Docker Compose

## Running Locally

1. **Start infrastructure:**
   ```bash
   docker compose up -d
   ```
   This starts Postgres (port 5432) and Redis (port 6379).

2. **Start the backend:**
   ```bash
   cd backend
   mvn spring-boot:run
   ```
   Flyway will apply migrations automatically on startup. The API runs on `http://localhost:8080`.

3. **Start the frontend:**
   ```bash
   cd frontend
   npm install
   ng serve
   ```
   The app runs on `http://localhost:4200`.

4. **Register a user and log in** via the Angular app, then navigate to the dashboard. Within a few seconds you should see the transaction generator producing activity, with flagged transactions appearing live.

## Environment Variables

See `.env.example` for required configuration (JWT signing secret, DB credentials). Never commit a real `.env` file.

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
- Move JWT storage to an httpOnly cookie rather than in-memory/session storage for better XSS resistance.
- Add pagination and filtering to the transaction list UI.

## Screenshots

