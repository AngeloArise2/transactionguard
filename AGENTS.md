# AGENTS.md — Instructions for the coding agent (opencode)

This file governs how the agent should work in this repository. Read this in full before writing any code. Follow it exactly. If a conflict ever exists between this file and a user instruction mid-session, ask before proceeding.

## 1. Project Identity

- **Name:** TransactionGuard
- **One-line description:** A real-time transaction monitoring system that ingests simulated banking transactions, flags anomalies against each customer's spending pattern, and streams flagged events live to a dashboard.
- **Why this project exists:** This is a portfolio/learning project built to demonstrate full-stack engineering with a real-time, data-driven component — not a toy CRUD app. Every architectural decision should be one the developer (a human learning alongside the agent) can explain in an interview.

## 2. Tech Stack (do not substitute without asking)

| Layer | Technology | Notes |
|---|---|---|
| Backend | Java 17+, Spring Boot 3.x/4.x | Use Spring Initializr conventions. Note: this repo currently builds on Spring Boot 4.0.7. |
| Backend build tool | Maven | Not Gradle |
| Persistence | Spring Data JPA + Hibernate | |
| Database | PostgreSQL 15+ | Run via Docker Compose locally |
| Cache | Redis 7+ | Run via Docker Compose locally |
| Real-time transport | Spring WebSocket + STOMP over SockJS | Not raw WebSocket, not Server-Sent Events |
| Auth | Spring Security + JWT (jjwt library) | |
| Frontend | Angular 17+ (standalone components, no NgModules) | |
| Frontend HTTP | Angular HttpClient | |
| Frontend real-time | @stomp/stompjs + sockjs-client | |
| Frontend charts | ngx-charts or Chart.js via ng2-charts | Pick one, be consistent |
| Frontend styling | Angular Material OR plain SCSS — agent should ask which, default to plain SCSS with a clean custom look if not specified |
| Containerization | Docker Compose for Postgres + Redis (not for the apps themselves, run those locally with `mvn spring-boot:run` and `ng serve`) |

## 3. Repository Structure

Build the repo with this exact top-level structure:

```
transactionguard/
├── backend/                  # Spring Boot application
│   ├── src/main/java/com/transactionguard/
│   │   ├── config/           # Security, WebSocket, Redis, CORS config classes
│   │   ├── controller/       # REST controllers
│   │   ├── dto/              # Request/response DTOs — never expose entities directly
│   │   ├── entity/           # JPA entities
│   │   ├── repository/       # Spring Data repositories
│   │   ├── service/          # Business logic — anomaly scoring lives here
│   │   ├── generator/        # Scheduled transaction simulator
│   │   ├── websocket/        # STOMP controllers / message handling
│   │   └── security/         # JWT filter, JWT util, UserDetailsService
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   ├── application-dev.yml
│   │   └── db/migration/     # Flyway migration scripts (V1__init.sql etc.)
│   └── pom.xml
├── frontend/                  # Angular application
│   └── src/app/
│       ├── core/              # Auth service, HTTP interceptor, websocket service
│       ├── features/
│       │   ├── dashboard/
│       │   ├── transactions/
│       │   └── auth/
│       └── shared/             # Shared components (charts, tables, badges)
├── docker-compose.yml          # Postgres + Redis only
├── AGENTS.md                    # this file
├── SKILLS.md
├── README.md
└── REVIEW.md
```

## 4. Build Order — Do Not Skip Ahead

Build in this exact sequence. Do not start a phase until the previous phase compiles, runs, and its acceptance criteria (see BUILD_PROMPT.md) are met. This order is deliberate: it mirrors how the developer will need to explain the system's architecture later, and skipping ahead produces code the developer can't reason about.

1. Docker Compose (Postgres + Redis) + Flyway migration + JPA entities + repositories
2. Basic REST CRUD (customers, transactions) — no auth yet
3. JWT auth (register/login, secure the CRUD endpoints)
4. Transaction generator (scheduled job simulating incoming transactions)
5. Anomaly scoring service (uses Redis for fast rolling-average lookups)
6. WebSocket/STOMP layer — push flagged transactions live
7. Angular: auth + HTTP layer + core CRUD screens
8. Angular: live dashboard (WebSocket subscription + chart)
9. Polish, error handling, README, deployment notes

## 5. Coding Conventions

**Backend**
- Never expose JPA entities directly in controller responses — always map to DTOs.
- Constructor injection only. No field injection (`@Autowired` on fields is forbidden).
- All endpoints return proper HTTP status codes (201 on create, 404 on not found, 400 on validation failure — use `@ExceptionHandler`/`@ControllerAdvice`, not try/catch scattered everywhere).
- All monetary values use `BigDecimal`, never `float`/`double`.
- All timestamps use `Instant` or `OffsetDateTime`, never `Date`.
- Package-by-feature is NOT used here — this project uses package-by-layer (see structure above) since it's a small project and layer-based is easier for the developer to navigate while learning.

**Frontend**
- Standalone components only, no NgModules.
- Use Angular signals for local component state where reasonable; use RxJS for async streams (HTTP, WebSocket).
- All HTTP calls go through a typed service in `core/` — components never call `HttpClient` directly.
- Strong typing everywhere — no `any`. Define interfaces for every API response shape.

**General**
- Every non-trivial method gets a one-line comment explaining *why*, not *what* (the code already shows what).
- Commit after each phase in section 4, with a message describing what was completed.
- After finishing each phase, the agent must output a short plain-English summary of what it built and why, so the developer can follow along.

## 6. What the Agent Must NOT Do

- Do not use an actual ML/deep-learning library (no TensorFlow, no scikit-learn microservice). The anomaly detection is a statistical rule (rolling average + standard deviation threshold) implemented directly in Java. Keep it explainable in one sentence.
- Do not add authentication providers, OAuth, or third-party identity beyond a simple username/password + JWT — this is out of scope and adds unexplainable surface area.
- Do not silently swap Postgres for another database, or STOMP for raw WebSocket, without flagging it to the developer first.
- Do not generate placeholder/lorem-ipsum data in a way that looks fake in the UI — use realistic-looking merchant names, amounts, and timestamps for the transaction generator so the dashboard looks credible in a demo/screen-recording.

## 7. When Stuck

If a build step fails or a design decision is ambiguous, stop and ask the developer rather than guessing silently and moving on. The goal of this project is developer understanding, not just a working build.
