# BUILD_PROMPT.md — Master prompt for opencode

Paste this entire file as your initial prompt to opencode (or feed it phase-by-phase — recommended, see note at the bottom). It assumes opencode has already read `AGENTS.md` in this repo root; if your tool doesn't auto-load that file, paste `AGENTS.md`'s contents first, then this file.

---

## MASTER INSTRUCTION TO THE AGENT

You are building "TransactionGuard," a full-stack real-time transaction anomaly detection system, exactly as specified in `AGENTS.md`. Follow the phase order below precisely. After completing each phase, stop, run the app, verify the acceptance criteria listed for that phase, and output a plain-English summary of what you built before moving to the next phase. Do not combine phases. Do not skip validation steps.

---

## PHASE 1 — Infrastructure, Schema, Entities, Repositories

**Goal:** Postgres and Redis running via Docker Compose, Flyway migrations applied, JPA entities and repositories in place, application boots successfully with no controllers yet.

**Steps:**

1. Create `docker-compose.yml` at repo root with two services:
   - `postgres`: image `postgres:15`, environment `POSTGRES_DB=transactionguard`, `POSTGRES_USER=tg_user`, `POSTGRES_PASSWORD=tg_pass`, port mapped `5432:5432`, with a named volume for data persistence.
   - `redis`: image `redis:7`, port mapped `6379:6379`.

2. Initialize the Spring Boot project in `backend/` via Spring Initializr conventions (Maven, Java 17, Spring Boot 3.x) with these dependencies: `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-security`, `spring-boot-starter-websocket`, `spring-boot-starter-validation`, `postgresql` driver, `flyway-core`, `spring-boot-starter-data-redis`, `jjwt-api`/`jjwt-impl`/`jjwt-jackson` (JWT library), `lombok`.

3. Create `application.yml` and `application-dev.yml` under `backend/src/main/resources/`:
   - Datasource URL pointing to `localhost:5432/transactionguard` with the credentials above.
   - `spring.jpa.hibernate.ddl-auto: validate` (NOT `update` — Flyway owns schema).
   - Redis host/port config for `localhost:6379`.
   - Server port `8080`.

4. Create Flyway migration `backend/src/main/resources/db/migration/V1__init.sql` creating three tables exactly as described in `SKILLS.md` section 1: `customers`, `transactions`, and either a `flagged_transactions` table or flag columns on `transactions` — decide and document the choice in a code comment at the top of the migration file.

5. Create JPA entities in `entity/`: `Customer.java`, `Transaction.java` (and `FlaggedTransaction.java` if using the separate-table approach). Use Lombok `@Getter`/`@Setter`/`@NoArgsConstructor`/`@AllArgsConstructor`. Use `BigDecimal` for amount, `Instant` for timestamps.

6. Create repository interfaces in `repository/`: `CustomerRepository extends JpaRepository<Customer, Long>`, `TransactionRepository extends JpaRepository<Transaction, Long>` with at least one custom method: `List<Transaction> findByCustomerIdOrderByOccurredAtDesc(Long customerId)`.

**Acceptance criteria for Phase 1:**
- `docker compose up -d` starts Postgres and Redis without error.
- `mvn spring-boot:run` boots the Spring Boot app with no errors, Flyway logs show `V1__init.sql` applied successfully.
- Connecting to Postgres directly (e.g. via `psql` or a GUI client) shows the three tables with correct columns.
- No controllers exist yet — this phase is infrastructure only.

---

## PHASE 2 — Basic REST CRUD (no auth yet)

**Goal:** Full CRUD for customers and transactions via REST, using DTOs, proper status codes, and centralized exception handling. No security yet — that's Phase 3.

**Steps:**

1. Create DTOs in `dto/`: `CustomerRequestDto`, `CustomerResponseDto`, `TransactionRequestDto`, `TransactionResponseDto`. Use `jakarta.validation` annotations (`@NotBlank`, `@Email`, `@Positive`, etc.) on request DTOs.

2. Create `service/CustomerService.java` and `service/TransactionService.java` with standard CRUD methods, mapping between entities and DTOs manually (no MapStruct — keep it simple and visible for learning purposes) inside the service layer.

3. Create `controller/CustomerController.java` with endpoints:
   - `POST /api/customers` → 201 + created customer
   - `GET /api/customers/{id}` → 200 or 404
   - `GET /api/customers` → 200, paginated list
   - `PUT /api/customers/{id}` → 200 or 404
   - `DELETE /api/customers/{id}` → 204 or 404

4. Create `controller/TransactionController.java` with endpoints:
   - `POST /api/transactions` → 201 (this will later trigger anomaly scoring in Phase 5 — for now just persist)
   - `GET /api/transactions/{id}` → 200 or 404
   - `GET /api/transactions?customerId={id}` → 200, list for that customer

5. Create a global exception handler: `@ControllerAdvice` class in a new `exception/` package with a `GlobalExceptionHandler`, handling `MethodArgumentNotValidException` (→ 400 with field errors), a custom `ResourceNotFoundException` (→ 404), and a catch-all (→ 500 with a generic message, never leaking stack traces to the client).

**Acceptance criteria for Phase 2:**
- All endpoints above work correctly when tested with `curl` or Postman — test and show the actual request/response for at least one success and one validation-failure case per entity.
- Invalid input (e.g., negative transaction amount, malformed email) returns 400 with a clear field-level error message, not a stack trace.
- Requesting a non-existent ID returns 404, not 500.

---

## PHASE 3 — JWT Authentication

**Goal:** Register/login endpoints, JWT issuance, and all CRUD endpoints from Phase 2 protected behind a valid token.

**Steps:**

1. Create a `User` entity (`security/` or `entity/`) with fields: id, username, password (hashed), role. Add a corresponding Flyway migration `V2__add_users.sql`.

2. Create `security/JwtUtil.java`: methods to generate a token (subject = username, expiry = configurable, e.g. 24h) and validate/parse a token, signed with an HMAC secret loaded from `application.yml` (never hardcoded in Java source).

3. Create `security/JwtAuthFilter.java` extending `OncePerRequestFilter`: reads the `Authorization: Bearer <token>` header, validates it, and sets the `SecurityContext` if valid.

4. Create `security/SecurityConfig.java`: configure the filter chain, permit `/api/auth/**` without authentication, require authentication for everything under `/api/customers/**` and `/api/transactions/**`, disable CSRF (stateless API), configure CORS to allow the Angular dev server origin (`http://localhost:4200`).

5. Create `controller/AuthController.java`:
   - `POST /api/auth/register` → creates a user with a BCrypt-hashed password, returns 201
   - `POST /api/auth/login` → validates credentials, returns a JWT + expiry timestamp on success, 401 on failure

**Acceptance criteria for Phase 3:**
- Calling any `/api/customers` endpoint without a token returns 401.
- `POST /api/auth/register` then `POST /api/auth/login` returns a valid JWT.
- Including that JWT in the `Authorization` header on a Phase 2 endpoint now succeeds.
- Passwords are confirmed (by inspecting the `users` table directly) to be BCrypt hashes, never plaintext.

---

## PHASE 4 — Transaction Generator (scheduled simulator)

**Goal:** A background job that creates realistic simulated transactions for existing customers at a regular interval, so the system has continuous data flowing without manual input.

**Steps:**

1. Enable scheduling: add `@EnableScheduling` to the main application class.

2. Create `generator/TransactionGeneratorService.java` with a `@Scheduled(fixedRate = 5000)` method (every 5 seconds, configurable via `application.yml`) that:
   - Picks a random existing customer from the database (seed at least 5-10 customers via a Flyway migration `V3__seed_customers.sql` if none exist yet, or via a `CommandLineRunner` — pick one approach and be consistent).
   - Generates a transaction with a realistic merchant name (maintain a hardcoded list: "Amazon", "Uber", "Starbucks", "Local Grocery Mart", "Netflix", "Shell Gas Station", etc.), a category, and an amount drawn from a normal-ish distribution around a per-customer baseline.
   - Roughly 1 in every 15-20 generated transactions should be a deliberate spike (5-10x the customer's normal amount) so the anomaly detector in Phase 5 has real signal to catch — this is a simulation detail, document it clearly in a code comment and in the README.
   - Saves the transaction via `TransactionService` (reuse the Phase 2 service, don't duplicate logic).

**Acceptance criteria for Phase 4:**
- Running the app for 1-2 minutes with the generator active produces new rows in the `transactions` table, visible via `GET /api/transactions?customerId=...`.
- At least one deliberate spike transaction is observably much larger than a customer's typical amount when you inspect the data after a few minutes.

---

## PHASE 5 — Anomaly Scoring Service (Redis-backed)

**Goal:** Every generated (and manually-created) transaction is checked against a per-customer rolling average stored in Redis, and flagged if it exceeds a threshold.

**Steps:**

1. Configure `RedisTemplate<String, String>` (or use `StringRedisTemplate`) in a `config/RedisConfig.java` class.

2. Create `service/AnomalyDetectionService.java` with:
   - A method `checkAndScore(Transaction transaction)` that:
     a. Reads the current rolling average for `transaction.getCustomerId()` from Redis (key pattern: `customer:{id}:avg`). If no value exists yet, treat this as the first transaction and just store the current amount as the initial average, mark as not flagged.
     b. Compares the incoming amount to `average * 3` (the threshold multiplier — make this a configurable constant, not magic-numbered inline).
     c. If it exceeds the threshold, mark the transaction as flagged with a reason string (e.g., `"Amount is 4.2x customer's rolling average"` — compute and include the actual multiple in the message).
     d. Updates the rolling average in Redis using the exponential moving average formula from `SKILLS.md` section 5, with `alpha = 0.3` as a named constant.
     e. Persists the flagged status/reason on the transaction (update the `transactions` row or insert into `flagged_transactions`, matching whichever schema decision was made in Phase 1).
   - Wire this into `TransactionService.createTransaction(...)` from Phase 2, and into the generator from Phase 4, so both manually-created and generated transactions go through the same scoring path.

**Acceptance criteria for Phase 5:**
- Creating a transaction via the API for a customer with no prior history is never flagged (no baseline to compare against yet).
- Creating a second transaction for the same customer at roughly 5x the first amount IS flagged, and the reason string correctly states the multiple.
- Inspecting Redis directly (`redis-cli GET customer:1:avg`) shows a sensible rolling average value that changes as more transactions are processed.

---

## PHASE 6 — WebSocket / STOMP Layer

**Goal:** Flagged transactions are pushed live to any subscribed client the instant they're flagged, using STOMP over WebSocket with a SockJS fallback.

**Steps:**

1. Create `config/WebSocketConfig.java` implementing `WebSocketMessageBrokerConfigurer`:
   - Register endpoint `/ws` with SockJS enabled.
   - Enable a simple broker on `/topic`.
   - Set application destination prefix `/app` (not strictly needed here since the server pushes, not the client, but include it for completeness and note this in a comment).

2. In `AnomalyDetectionService` (Phase 5), inject a `SimpMessagingTemplate` and, whenever a transaction is flagged, call `messagingTemplate.convertAndSend("/topic/flagged-transactions", flaggedTransactionDto)`. Define `FlaggedTransactionDto` in `dto/` with the fields the frontend dashboard needs (transaction id, customer name, amount, merchant, reason, timestamp).

3. Ensure CORS/SockJS config allows connections from `http://localhost:4200`.

**Acceptance criteria for Phase 6:**
- Using a simple STOMP test client (e.g., a small test HTML page with stompjs, or Postman's WebSocket support) connected to `ws://localhost:8080/ws` and subscribed to `/topic/flagged-transactions`, you see a message appear in real time when a flagged transaction occurs (trigger one manually via the API with an obviously large amount, or wait for the generator to produce one).

---

## PHASE 7 — Angular: Auth + Core CRUD Screens

**Goal:** Angular app can register/login, store the JWT, attach it to outgoing requests, and display/manage customers and transactions.

**Steps:**

1. Generate the Angular app in `frontend/` with routing enabled, standalone components (`ng new frontend --standalone --routing`).

2. Create `core/auth.service.ts`: `register()`, `login()` (calls the backend, stores the JWT in memory + a signal, NOT in `localStorage` for this learning project — explain in code comment that a production system would consider httpOnly cookies instead; for this project's scope, an in-memory signal that resets on refresh is an acceptable, explainable trade-off. If the developer wants persistence across refresh, `sessionStorage` is an acceptable middle ground — pick one and document why).

3. Create `core/auth.interceptor.ts`: an `HttpInterceptorFn` that attaches `Authorization: Bearer <token>` to outgoing requests when a token is present.

4. Create `core/websocket.service.ts`: wraps `@stomp/stompjs` + `sockjs-client`, exposing a method to connect and an `Observable<FlaggedTransaction>` that components can subscribe to.

5. Create `features/auth/` — login and register components/forms (reactive forms, basic validation).

6. Create `features/transactions/` — a component listing transactions for a customer (calls the backend via a typed `transaction.service.ts` in `core/` or `features/transactions/`), and a simple create-transaction form.

7. Define TypeScript interfaces matching every backend DTO exactly (no `any`).

**Acceptance criteria for Phase 7:**
- A user can register, log in, and see a JWT-authenticated request succeed (e.g., loading the transactions list) — verify in browser dev tools that the `Authorization` header is present and the request returns 200, not 401.
- Logging out (clearing the token) and attempting the same request correctly fails/redirects to login.

---

## PHASE 8 — Angular: Live Dashboard

**Goal:** A dashboard page showing a live feed of flagged transactions (via WebSocket) and a simple chart summarizing flagged vs. normal transaction volume.

**Steps:**

1. Create `features/dashboard/dashboard.component.ts`: on init, connects via `websocket.service.ts`, subscribes to the flagged-transaction stream, and prepends new items to a live-updating list (cap the display at, e.g., the last 50 for performance).

2. Add a simple chart (ngx-charts or ng2-charts, per the choice made in `AGENTS.md`) showing flagged transaction count over recent time buckets, updating as new events arrive.

3. Style the flagged items distinctly (e.g., a red/amber badge with the reason string shown on hover or inline).

**Acceptance criteria for Phase 8:**
- With the backend generator running, opening the dashboard shows new flagged transactions appearing in the live feed within a few seconds of them being flagged on the backend, with no page refresh.
- The chart updates to reflect new data without a manual reload.

---

## PHASE 9 — Polish, Error Handling, README, Deployment Notes

**Goal:** The project is presentable, documented, and has basic resilience.

**Steps:**

1. Add a global HTTP error interceptor on the frontend (handles 401 → redirect to login, 500 → toast/snackbar with a generic message).

2. Add loading and empty states to every list/table in the UI (no bare blank screens).

3. Fill in `README.md` per the separate `README.md` template provided in this repo (see that file) — do not leave placeholder text.

4. Add a `.env.example` or documented environment variables list for anything secret (JWT signing key, DB credentials) — never commit real secrets.

5. Confirm `docker compose up -d`, `mvn spring-boot:run`, and `ng serve` together bring up a fully working system from a clean clone, and document these exact steps in the README.

**Acceptance criteria for Phase 9:**
- A person who has never seen this project can clone it, follow the README, and have it running end-to-end within 10 minutes.
- Run through `REVIEW.md` in full (see that file) and fix anything it flags before considering the project done.

---

## Note on how to feed this to opencode

You have two reasonable approaches:

1. **Paste the whole file at once** and let the agent work through all 9 phases autonomously, checking in after each one (this file instructs it to stop and summarize after each phase — hold it to that).
2. **Paste one phase at a time** (recommended if this is your first time doing something like this) — copy just the "PHASE N" section, let it finish and verify, review the code yourself, ask questions, THEN move to the next phase. This is slower but you'll retain far more, and it's much easier to catch a wrong turn early rather than after 3 more phases are built on top of it.

Given you said you want to actually learn this — go with option 2.
