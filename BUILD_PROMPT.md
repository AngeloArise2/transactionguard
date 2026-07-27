# BUILD_PROMPT.md — Master prompt for opencode

Paste this entire file as your initial prompt to opencode (or feed it phase-by-phase — recommended, see note at the bottom). It assumes opencode has already read `AGENTS.md` in this repo root via `opencode.json`'s `instructions` field.

---

## MASTER INSTRUCTION TO THE AGENT

You are building "TransactionGuard," a full-stack real-time transaction anomaly detection system, exactly as specified in `AGENTS.md`. Follow the phase order below precisely. After completing each phase, stop, run the app, verify the acceptance criteria listed for that phase, and output a plain-English summary of what you built before moving to the next phase. Do not combine phases. Do not skip validation steps.

**IMPORTANT — read the STATUS block in Phase 1 before doing anything.** Some setup work is already done; don't recreate it, don't assume it's missing, and don't silently overwrite it.

---

## PHASE 1 — Infrastructure, Schema, Entities, Repositories

**Goal:** Postgres and Redis running via Docker Compose, Flyway migrations applied, JPA entities and repositories in place, application boots successfully with no controllers yet.

**STATUS — already done before you start:**
- ✅ `docker-compose.yml` exists at the repo root with `postgres` (image `postgres:15`, `POSTGRES_DB=transactionguard`, `POSTGRES_USER=tg_user`, `POSTGRES_PASSWORD=tg_pass`, port `5432:5432`, named volume) and `redis` (image `redis:7`, port `6379:6379`). **Do not recreate this file.** First action: read it and confirm it matches this spec; only flag/propose a change if something later genuinely conflicts with it — don't change it silently.
- ✅ `backend/` already exists — a Spring Boot project generated via Spring Initializr (Maven, Java 17, Spring Boot 3.x). **Do not run Spring Initializr again or regenerate this folder.**
- ✅ `frontend/` already exists — an Angular project generated via `ng new`. Not needed until Phase 7, but noted here so you don't try to regenerate it later either.

**STATUS — still to do, this is your actual starting point:**
- ⏳ `backend/src/main/resources/application.yml` exists but is empty/default (Spring Initializr's boilerplate). This needs to be fully populated per step 3 below.
- ⏳ `backend/pom.xml` — check it now. Spring Initializr should already have added most required dependencies; the `jjwt-*` (JWT) libraries almost certainly are NOT present yet since Spring Initializr doesn't offer them as a checkbox option — these need to be added manually.
- ⏳ Flyway migration, JPA entities, and repositories (steps 4-6 below) — none of this exists yet.

**Steps:**

1. Verify `docker-compose.yml` matches the spec above. Do not recreate or rewrite it unless you find an actual mismatch — report any mismatch to the developer rather than silently fixing it.

2. Run `cat backend/pom.xml` and compare its `<dependencies>` block against this required list: `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-security`, `spring-boot-starter-websocket`, `spring-boot-starter-validation`, `postgresql` driver, `flyway-core`, `spring-boot-starter-data-redis`, `jjwt-api`/`jjwt-impl`/`jjwt-jackson`, `lombok`. Add whatever's missing using the exact dependency block from `OPENCODE_SKILLS.md` section 1 — do not remove or alter dependencies that are already correctly present.

3. Populate `backend/src/main/resources/application.yml` (currently empty) and create `application-dev.yml`:
   - Datasource URL pointing to `localhost:5432/transactionguard` with the credentials from `docker-compose.yml` (`tg_user`/`tg_pass`).
   - `spring.jpa.hibernate.ddl-auto: validate` (NOT `update` — Flyway owns schema).
   - Redis host/port config for `localhost:6379`.
   - Server port `8080`.
   - Use the full template in `OPENCODE_SKILLS.md` section 2 as the reference, including the `app.jwt.secret`, `app.anomaly.threshold-multiplier`, and `app.anomaly.ema-alpha` config values needed by later phases — add them now even though they're unused until Phase 3/5, so the config file is complete in one pass.

4. Create Flyway migration `backend/src/main/resources/db/migration/V1__init.sql` creating three tables exactly as described in `SKILLS.md` section 1: `customers`, `transactions`, and either a `flagged_transactions` table or flag columns on `transactions` — decide and document the choice in a code comment at the top of the migration file. Use the SQL template in `OPENCODE_SKILLS.md` section 4 as the reference.

5. Create JPA entities in `entity/`: `Customer.java`, `Transaction.java` (and `FlaggedTransaction.java` if using the separate-table approach). Use Lombok `@Getter`/`@Setter`/`@NoArgsConstructor`/`@AllArgsConstructor`. Use `BigDecimal` for amount, `Instant` for timestamps. Reference `OPENCODE_SKILLS.md` section 3 for the exact entity pattern.

6. Create repository interfaces in `repository/`: `CustomerRepository extends JpaRepository<Customer, Long>`, `TransactionRepository extends JpaRepository<Transaction, Long>` with at least one custom method: `List<Transaction> findByCustomerIdOrderByOccurredAtDesc(Long customerId)`.

**Acceptance criteria for Phase 1:**
- `docker compose up -d` starts Postgres and Redis without error (verify with `docker ps` — both should show `(healthy)`).
- `mvn spring-boot:run` (from `backend/`) boots the Spring Boot app with no errors, Flyway logs show `V1__init.sql` applied successfully.
- Connecting to Postgres directly (`docker exec -it transactionguard-postgres psql -U tg_user -d transactionguard -c "\dt"`) shows the three tables with correct columns.
- No controllers exist yet — this phase is infrastructure only.

---

## PHASE 2 — Basic REST CRUD (no auth yet)

**Goal:** Full CRUD for customers and transactions via REST, using DTOs, proper status codes, and centralized exception handling. No security yet — that's Phase 3.

**Steps:**

1. Create DTOs in `dto/`: `CustomerRequestDto`, `CustomerResponseDto`, `TransactionRequestDto`, `TransactionResponseDto`. Use `jakarta.validation` annotations (`@NotBlank`, `@Email`, `@Positive`, etc.) on request DTOs. Use the record pattern from `OPENCODE_SKILLS.md` section 5.

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

5. Create a global exception handler using the pattern in `OPENCODE_SKILLS.md` section 6: `@RestControllerAdvice` class in a new `exception/` package handling `MethodArgumentNotValidException` (→ 400 with field errors), a custom `ResourceNotFoundException` (→ 404), and a catch-all (→ 500 with a generic message, never leaking stack traces to the client).

**Acceptance criteria for Phase 2:**
- All endpoints above work correctly when tested with `curl` or Postman — test and show the actual request/response for at least one success and one validation-failure case per entity.
- Invalid input (e.g., negative transaction amount, malformed email) returns 400 with a clear field-level error message, not a stack trace.
- Requesting a non-existent ID returns 404, not 500.

---

## PHASE 3 — JWT Authentication

**Goal:** Register/login endpoints, JWT issuance, and all CRUD endpoints from Phase 2 protected behind a valid token.

**Steps:**

1. Create a `User` entity (`security/` or `entity/`) with fields: id, username, password (hashed), role. Add a corresponding Flyway migration `V2__add_users.sql`.

2. Create `security/JwtUtil.java`: methods to generate a token (subject = username, expiry = configurable, e.g. 24h) and validate/parse a token, signed with the `app.jwt.secret` HMAC secret from `application.yml` (never hardcoded in Java source).

3. Create `security/JwtAuthFilter.java` extending `OncePerRequestFilter`, using the pattern in `OPENCODE_SKILLS.md` section 7.

4. Create `security/SecurityConfig.java`, using the pattern in `OPENCODE_SKILLS.md` section 7 — configure the filter chain, permit `/api/auth/**` without authentication, require authentication for everything under `/api/customers/**` and `/api/transactions/**`, disable CSRF (stateless API), configure CORS to allow the Angular dev server origin (`http://localhost:4200`).

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

2. Create `generator/TransactionGeneratorService.java` using the pattern in `OPENCODE_SKILLS.md` section 10, with a `@Scheduled(fixedRateString = "${app.generator.interval-ms:5000}")` method that:
   - Picks a random existing customer from the database (seed at least 5-10 customers via a Flyway migration `V3__seed_customers.sql` if none exist yet).
   - Generates a transaction with a realistic merchant name, a category, and an amount drawn from a normal-ish distribution around a per-customer baseline.
   - Roughly 1 in every 15-20 generated transactions should be a deliberate spike (5-10x the customer's normal amount) so the anomaly detector in Phase 5 has real signal to catch.
   - Saves the transaction via `TransactionService` (reuse the Phase 2 service, don't duplicate logic).

**Acceptance criteria for Phase 4:**
- Running the app for 1-2 minutes with the generator active produces new rows in the `transactions` table, visible via `GET /api/transactions?customerId=...`.
- At least one deliberate spike transaction is observably much larger than a customer's typical amount when you inspect the data after a few minutes.

---

## PHASE 5 — Anomaly Scoring Service (Redis-backed)

**Goal:** Every generated (and manually-created) transaction is checked against a per-customer rolling average stored in Redis, and flagged if it exceeds a threshold.

**Steps:**

1. Configure `StringRedisTemplate` in a `config/RedisConfig.java` class.

2. Create `service/AnomalyDetectionService.java` using the exact pattern in `OPENCODE_SKILLS.md` section 8:
   - Read the current rolling average for the customer from Redis (key pattern: `customer:{id}:avg`). If none exists, store the current amount as the initial average, mark as not flagged.
   - Compare the incoming amount to `average * threshold-multiplier` (from `application.yml`, not hardcoded).
   - If it exceeds the threshold, mark the transaction as flagged with a reason string stating the actual computed multiple.
   - Update the rolling average using the exponential moving average formula (`ema-alpha` from `application.yml`).
   - Persist the flagged status/reason on the transaction.
   - Wire this into `TransactionService.createTransaction(...)` and into the Phase 4 generator, so both paths go through the same scoring logic.

**Acceptance criteria for Phase 5:**
- A brand-new customer's first transaction is never flagged (no baseline exists yet).
- A transaction at roughly 5x a customer's established average IS flagged, with the reason string correctly stating the multiple.
- `docker exec -it transactionguard-redis redis-cli GET customer:1:avg` shows a sensible rolling average value that changes as more transactions are processed.

---

## PHASE 6 — WebSocket / STOMP Layer

**Goal:** Flagged transactions are pushed live to any subscribed client the instant they're flagged, using STOMP over WebSocket with a SockJS fallback.

**Steps:**

1. Create `config/WebSocketConfig.java` using the pattern in `OPENCODE_SKILLS.md` section 9 — register endpoint `/ws` with SockJS, enable a simple broker on `/topic`, set application destination prefix `/app`.

2. In `AnomalyDetectionService` (Phase 5), inject a `SimpMessagingTemplate` and, whenever a transaction is flagged, call `messagingTemplate.convertAndSend("/topic/flagged-transactions", flaggedTransactionDto)`. Define `FlaggedTransactionDto` in `dto/` with the fields the frontend dashboard needs.

3. Ensure CORS/SockJS config allows connections from `http://localhost:4200`.

**Acceptance criteria for Phase 6:**
- Using a simple STOMP test client connected to `ws://localhost:8080/ws` and subscribed to `/topic/flagged-transactions`, you see a message appear in real time when a flagged transaction occurs.

---

## PHASE 7 — Angular: Auth + Core CRUD Screens

**Goal:** Angular app can register/login, store the JWT, attach it to outgoing requests, and display/manage customers and transactions.

**STATUS:** `frontend/` already exists (generated via `ng new`) — do not regenerate it. Start directly with step 2.

**Steps:**

1. ~~Generate the Angular app~~ — already done.

2. Create `core/auth.service.ts` using the pattern in `OPENCODE_SKILLS.md` section 12 for the interceptor and a similar signal-based approach for token storage — JWT stored in memory + a signal, NOT `localStorage`, for this learning project's scope.

3. Create `core/auth.interceptor.ts` using the exact pattern in `OPENCODE_SKILLS.md` section 12.

4. Create `core/websocket.service.ts` using the exact pattern in `OPENCODE_SKILLS.md` section 11.

5. Create `features/auth/` — login and register components/forms (reactive forms, basic validation).

6. Create `features/transactions/` — a component listing transactions for a customer, and a simple create-transaction form.

7. Define TypeScript interfaces matching every backend DTO exactly (no `any`).

**Acceptance criteria for Phase 7:**
- A user can register, log in, and see a JWT-authenticated request succeed — verify in browser dev tools that the `Authorization` header is present and the request returns 200, not 401.
- Logging out and attempting the same request correctly fails/redirects to login.

---

## PHASE 8 — Angular: Live Dashboard

**Goal:** A dashboard page showing a live feed of flagged transactions (via WebSocket) and a simple chart summarizing flagged vs. normal transaction volume.

**Steps:**

1. Create `features/dashboard/dashboard.component.ts`: on init, connects via `websocket.service.ts`, subscribes to the flagged-transaction stream, prepends new items to a live-updating list (cap at last 50).

2. Add a simple chart (ngx-charts or ng2-charts, per the choice made in `AGENTS.md`) showing flagged transaction count over recent time buckets, updating as new events arrive.

3. Style the flagged items distinctly (red/amber badge with the reason string shown on hover or inline).

**Acceptance criteria for Phase 8:**
- With the backend generator running, opening the dashboard shows new flagged transactions appearing in the live feed within a few seconds, with no page refresh.
- The chart updates without a manual reload.

---

## PHASE 9 — Polish, Error Handling, README, Deployment Notes

**Goal:** The project is presentable, documented, and has basic resilience.

**Steps:**

1. Add a global HTTP error interceptor on the frontend (401 → redirect to login, 500 → toast/snackbar with a generic message).

2. Add loading and empty states to every list/table in the UI.

3. Fill in `README.md` per the template already in this repo — do not leave placeholder text.

4. Confirm `.env.example` is accurate and complete (it should already exist at the repo root).

5. Confirm `docker compose up -d`, `mvn spring-boot:run`, and `ng serve` together bring up a fully working system from a clean clone, and document these exact steps in the README.

**Acceptance criteria for Phase 9:**
- A person who has never seen this project can clone it, follow the README, and have it running end-to-end within 10 minutes.
- Run through `REVIEW.md` in full and fix anything it flags before considering the project done.

---

## Note on how to feed this to opencode

Paste one phase at a time — copy just the "PHASE N" section, let it finish and verify, review the code yourself, ask questions, THEN move to the next phase. You're currently at the start of Phase 1's remaining work (steps 3-6) — copy from "**Steps:**" through Phase 1's acceptance criteria as your first paste.