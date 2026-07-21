# REVIEW.md — Full verification checklist

Run through every item below once the build is complete. This is meant to be used by YOU (or fed back to opencode as a review pass) to catch gaps before you consider this project resume-ready. Check off each item honestly — the point is to catch what's broken or missing, not to rubber-stamp it.

---

## A. Infrastructure & Database

- [ ] `docker compose up -d` starts both Postgres and Redis with no errors from a completely clean clone.
- [ ] Flyway migrations run automatically on backend startup and are visible in the logs (`Flyway ... Successfully applied N migrations`).
- [ ] No use of `spring.jpa.hibernate.ddl-auto: update` or `create` — schema is Flyway-owned only.
- [ ] Connecting directly to Postgres shows correct table structure, correct types (amounts as `numeric`/`decimal`, not `float`), and correct foreign keys.
- [ ] Redis is reachable and contains per-customer rolling-average keys after transactions have been processed (check with `redis-cli KEYS "customer:*"`).

## B. Backend — REST API

- [ ] Every entity has a matching request/response DTO — controller methods never return JPA entities directly (check imports in every `@RestController`).
- [ ] All write endpoints validate input and return 400 with clear field errors on invalid data (test with an empty required field, a negative amount, a malformed email).
- [ ] All "not found" cases return 404, not 500 or an unhandled exception stack trace.
- [ ] No endpoint that should require auth is reachable without a valid JWT (test every protected endpoint with no token, and with an expired/malformed token — expect 401 in all cases).
- [ ] Passwords in the `users` table are BCrypt hashes — confirm by inspecting the raw column value directly.
- [ ] The JWT secret is loaded from configuration, not hardcoded in a `.java` file.
- [ ] `pom.xml` has no unused or leftover dependencies from earlier experimentation.

## C. Backend — Anomaly Detection

- [ ] The rolling average logic is implemented in one clearly-named service class, not scattered across the generator, controller, and service.
- [ ] A brand-new customer's first transaction is never flagged (no baseline exists yet) — confirmed by testing directly.
- [ ] A transaction significantly above a customer's established average IS flagged, with a human-readable reason string that includes the actual computed multiple (e.g., "4.1x average"), not just a boolean.
- [ ] The threshold multiplier (e.g., 3x) and the EMA alpha value are named constants/config values, not magic numbers buried inline.
- [ ] You (the developer) can explain out loud, without looking at the code, exactly how a transaction gets flagged — if you can't, revisit `SKILLS.md` section 6 before moving on.

## D. Backend — Real-Time (WebSocket/STOMP)

- [ ] The WebSocket endpoint (`/ws`) is reachable and accepts SockJS connections.
- [ ] Flagged transactions are pushed to `/topic/flagged-transactions` within roughly a second of being flagged — no polling anywhere in this pipeline.
- [ ] Disconnecting and reconnecting a client doesn't crash the backend or leak connections (leave it running for a few minutes and check server logs/memory for anything alarming).
- [ ] CORS/SockJS config explicitly allows the Angular dev origin — no wildcard `*` origin in a way that would be a red flag if pointed out in an interview.

## E. Backend — Generator

- [ ] The generator produces transactions on a visible, working schedule (confirm via logs and by watching the `transactions` table grow).
- [ ] Merchant names and amounts look plausible, not obviously fake/placeholder (no "Merchant1", "Merchant2" — real-sounding names per `AGENTS.md` section 6).
- [ ] Deliberate spikes occur at a low, believable frequency (not every transaction, not never) and are large enough to reliably trigger the anomaly threshold.
- [ ] The generator reuses the same service/validation path as the manual API endpoint — no duplicated business logic between the two.

## F. Frontend — Auth & Core

- [ ] Registration and login both work end-to-end against the real backend (not mocked).
- [ ] The JWT is correctly attached to every authenticated request — confirm in browser DevTools' Network tab, not just by assuming the interceptor works.
- [ ] An expired or missing token correctly redirects to the login screen rather than showing a broken/blank authenticated page.
- [ ] No `any` types in TypeScript for API response shapes — every response has a defined interface.
- [ ] No direct `HttpClient` calls inside components — all HTTP goes through a service.

## G. Frontend — Dashboard

- [ ] The live feed updates without any manual refresh when a new flagged transaction occurs on the backend.
- [ ] The chart updates alongside the live feed and accurately reflects the underlying data (spot-check a few data points manually).
- [ ] Flagged items are visually distinct (color/badge) and show the reason on hover or inline — not just a raw boolean.
- [ ] The UI has loading and empty states — no bare blank screens while data is fetching or when there's nothing to show yet.
- [ ] Basic responsiveness — the dashboard doesn't visibly break at common laptop screen widths.

## H. Documentation & Presentation

- [ ] `README.md` has no leftover placeholder text (e.g., "TODO", "fill this in") — everything is filled in accurately.
- [ ] The README's "Running Locally" steps have actually been tested from a clean clone, not just written from memory.
- [ ] The architecture diagram/data-flow description in the README matches what was actually built (not what was originally planned, if anything changed along the way).
- [ ] A `.env.example` (or equivalent documented list) exists for required secrets, and no real secret is committed anywhere in the repo — check git history too, not just the current file state.
- [ ] Commit history tells a reasonable story (roughly matching the 9-phase build order) rather than one giant "initial commit."

## I. The Interview-Readiness Test

Answer these out loud, unaided, before considering the project done:

- [ ] "Walk me through what happens from the moment a transaction is created to the moment it shows up flagged on the dashboard."
- [ ] "Why Redis specifically, instead of just querying Postgres each time?"
- [ ] "Why WebSocket/STOMP instead of the frontend polling every few seconds?"
- [ ] "Why a threshold rule instead of a machine learning model?"
- [ ] "What would break first if this had to handle 10,000 transactions per second, and what would you change?"
- [ ] "What's one thing you'd do differently if you rebuilt this?"

If any of these make you pause and reach for the code instead of answering directly, that's the section to revisit before this goes on your resume.

---

## Final gate

Do not list this project on your resume or bring it into an interview until every box above is checked and the Interview-Readiness Test can be answered cold, without looking anything up.
