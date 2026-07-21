# SKILLS.md — What you need to understand, and why

This file is for YOU, not the agent. Read each section before the agent builds that piece, and again after, so you can actually explain it in an interview. Each section has: what it is, why this project uses it, and the one thing you must be able to say out loud about it.

---

## 1. PostgreSQL + Flyway (schema management)

**What it is:** PostgreSQL is your relational database. Flyway is a tool that applies your database schema changes as version-controlled SQL scripts (`V1__init.sql`, `V2__add_index.sql`, etc.) instead of letting Hibernate auto-generate tables.

**Why this project uses it:** Real production systems don't let an ORM auto-create tables in prod — schema changes are reviewed, versioned, and applied deliberately. Using Flyway (even in a small project) shows you understand this distinction.

**What you must be able to say:** *"I used Flyway migrations instead of Hibernate's `ddl-auto: update` because schema changes should be explicit and version-controlled, the same way application code is."*

**Core tables you'll have:**
- `customers` (id, name, email, created_at)
- `transactions` (id, customer_id FK, amount, merchant, category, occurred_at, is_flagged)
- `flagged_transactions` (id, transaction_id FK, reason, score, created_at) — optional separate table, or just a boolean + reason column on `transactions` if you want to keep it simpler

---

## 2. Spring Data JPA / Hibernate

**What it is:** JPA is a specification for mapping Java objects to database tables. Hibernate is the implementation Spring Boot uses by default. Spring Data JPA gives you repository interfaces (`CustomerRepository extends JpaRepository<Customer, Long>`) so you don't hand-write basic SQL.

**Why this project uses it:** It's the standard in the Java ecosystem — GS's own JD lists Java as a core language, and JPA is what nearly every Java backend team uses for persistence.

**What you must be able to say:** *"JpaRepository gives me CRUD and pagination for free; I wrote custom `@Query` methods only where I needed something JPA's method-name conventions couldn't express — like the rolling average lookup for anomaly scoring."*

---

## 3. DTOs (Data Transfer Objects) vs Entities

**What it is:** Entities are your database-mapped classes. DTOs are separate classes used only for API request/response bodies.

**Why this project uses it:** Never expose your database structure directly through your API. If you add a column to your `Customer` entity tomorrow, you don't want it silently leaking into every API response. It's also a security boundary — you control exactly what leaves the system.

**What you must be able to say:** *"I kept a strict separation between entities and DTOs so the API contract doesn't change every time the database schema changes."*

---

## 4. JWT Authentication + Spring Security

**What it is:** When a user logs in, the server issues a signed token (JWT) containing their identity. The client sends that token on every subsequent request (in the `Authorization: Bearer <token>` header). Spring Security's filter chain validates it on each request instead of maintaining server-side sessions.

**Why this project uses it:** Stateless auth is the standard for APIs consumed by SPAs (like your Angular frontend) and scales better than server-side sessions, since no session store is needed.

**What you must be able to say:** *"JWTs are stateless — the server doesn't store session data, it just verifies the token's signature and reads the claims. That's important for horizontal scaling: any server instance can validate any token without shared session state."*

---

## 5. Redis (caching layer)

**What it is:** An in-memory key-value store. Reads/writes are extremely fast because there's no disk I/O for typical operations.

**Why this project uses it:** Your anomaly detector needs to know "what's this customer's recent average transaction amount?" on *every incoming transaction*. Querying Postgres and recalculating an aggregate every single time is slow and doesn't scale. Instead, you maintain a rolling average per customer in Redis (updated incrementally) and read it in O(1) time.

**What you must be able to say:** *"I used Redis to cache each customer's rolling transaction average so the anomaly check is an O(1) lookup instead of a database aggregate query on every transaction. This is the difference between a system that works with 10 transactions and one that could plausibly handle thousands per second."*

**The actual technique (Welford's or simple exponential moving average):** Don't overcomplicate this. A simple exponential moving average is enough:
```
new_average = (alpha * new_transaction_amount) + (1 - alpha) * old_average
```
Store `old_average` in Redis per customer ID, update it after every transaction. Pick `alpha = 0.3` as a reasonable default — be ready to explain that a higher alpha weights recent transactions more heavily.

---

## 6. The Anomaly Detection Logic Itself

**What it is:** A statistical threshold rule, NOT machine learning. For each incoming transaction:
1. Look up the customer's current rolling average (and optionally a rolling standard deviation) from Redis.
2. If `transaction_amount > average * multiplier` (e.g., 3x), flag it.
3. Update the rolling average in Redis regardless of whether it was flagged.

**Why this project uses a simple rule instead of ML:** Because you need to be able to explain every part of it. A z-score/threshold rule is legitimate, used in real fraud systems as a first-pass filter before more complex models, and you can describe exactly why a transaction was flagged — which matters both for the interview and for the honesty of what you're presenting.

**What you must be able to say:** *"I used a rolling average with a 3x threshold rather than a trained ML model, because it's transparent, explainable, and appropriate as a first-pass filter — real fraud systems often layer simple rules like this before more complex models, precisely because you need to be able to explain to a customer or regulator why a transaction was flagged."*

---

## 7. WebSocket + STOMP + SockJS

**What it is:**
- **WebSocket** is a persistent, bidirectional connection between client and server (unlike HTTP's request/response model).
- **STOMP** is a simple messaging protocol layered on top of WebSocket, giving you pub/sub semantics (`/topic/flagged-transactions`) instead of raw byte streams.
- **SockJS** is a fallback library so the connection still works in environments that don't support raw WebSocket.

**Why this project uses it instead of polling:** If your Angular dashboard polled `/api/flagged-transactions` every 2 seconds, that's wasted requests and delayed updates. WebSocket pushes the flagged transaction to the client the instant it happens — genuinely real-time, and it demonstrates you understand when HTTP polling is the wrong tool.

**What you must be able to say:** *"I used STOMP over WebSocket instead of polling because polling either wastes requests when nothing's changed or adds latency waiting for the next poll interval. A push-based model means the dashboard updates the moment a transaction is flagged, which matters for a fraud-monitoring use case where minutes matter."*

---

## 8. The Transaction Generator (scheduled simulator)

**What it is:** A `@Scheduled` Spring Boot job that runs every few seconds and creates a fake but realistic transaction for a random customer (realistic merchant names, amounts mostly normal with occasional deliberate spikes so your anomaly detector has something to catch).

**Why this project uses it:** You don't have a real bank feed. This is a legitimate, honestly-labeled simulation — say so plainly in your README. It's a standard technique for demoing a real-time system.

**What you must be able to say:** *"Since I don't have access to a real transaction feed, I built a scheduled generator that simulates realistic transactions, including occasional deliberate spikes, so the anomaly detection and real-time pipeline can be demonstrated end-to-end."*

---

## 9. Angular Standalone Components + Signals

**What it is:** Modern Angular (v17+) no longer requires NgModules — components declare their own imports. Signals are a new reactive primitive for local state that's simpler than RxJS for many cases.

**Why this project uses it:** It's the current recommended Angular architecture, and using it (rather than an older NgModule-based structure) signals you're current with the ecosystem.

**What you must be able to say:** *"I used standalone components and signals for local UI state, and reserved RxJS specifically for asynchronous streams like HTTP calls and the WebSocket subscription — using each tool where it fits rather than defaulting to RxJS for everything."*

---

## 10. Docker Compose (for Postgres + Redis only)

**What it is:** A YAML file that spins up Postgres and Redis containers with one command (`docker compose up`), so you don't have to install and configure them manually.

**Why this project uses it:** It makes the project trivially runnable on any machine (including an interviewer's, if asked) and is standard practice for local dev environments.

**What you must be able to say:** *"I containerized just the infrastructure dependencies (Postgres, Redis) with Docker Compose, and ran the Spring Boot and Angular apps directly, since that's simpler for active development while still making the environment reproducible."*

---

## Study order

Read sections 1-3 before Phase 1-2 of the build. Read 4 before Phase 3. Read 5-6 before Phase 5. Read 7 before Phase 6. Read 9 before Phase 7-8. Re-read all of it once the whole thing runs end-to-end, and try explaining the full data flow out loud, start to finish, in under 2 minutes: *generator creates transaction → saved to Postgres → Redis rolling average checked → flagged if anomalous → STOMP pushes to subscribed clients → Angular dashboard updates live.*
