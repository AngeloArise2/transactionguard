# PREREQUISITES.md — Everything to install before starting

Install all of this before you open opencode and start Phase 1. Do this once, in one sitting, so you're not interrupting the build later to install something.

## 1. Java Development Kit (JDK) 17 or newer

- Download: [https://adoptium.net/](https://adoptium.net/) (Eclipse Temurin — recommended distribution) — pick JDK 17 (LTS) or 21 (LTS).
- Verify install:
  ```bash
  java -version
  ```
  Should print version 17 or higher.

## 2. Maven

- Download: [https://maven.apache.org/download.cgi](https://maven.apache.org/download.cgi) — or install via a package manager (see below).
- Verify install:
  ```bash
  mvn -version
  ```

## 3. Node.js + npm (LTS version, 20.x or newer)

- Download: [https://nodejs.org/](https://nodejs.org/) — get the LTS version.
- Verify install:
  ```bash
  node -v
  npm -v
  ```

## 4. Angular CLI

- Install globally via npm (after Node.js is installed):
  ```bash
  npm install -g @angular/cli
  ```
- Verify install:
  ```bash
  ng version
  ```

## 5. Docker Desktop (or Docker Engine + Compose on Linux)

- Download: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
- Verify install:
  ```bash
  docker -v
  docker compose version
  ```
- Make sure Docker Desktop is actually running (not just installed) before running `docker compose up`.

## 6. A Postgres client (optional but recommended, for inspecting the DB directly)

Pick one:
- **TablePlus** (GUI, free tier): [https://tableplus.com/](https://tableplus.com/)
- **DBeaver** (GUI, free, open source): [https://dbeaver.io/](https://dbeaver.io/)
- Or just use `psql` from inside the Postgres Docker container:
  ```bash
  docker exec -it <postgres-container-name> psql -U tg_user -d transactionguard
  ```

## 7. A Redis client (optional but recommended)

- `redis-cli` is enough, and you can run it directly from the Redis Docker container:
  ```bash
  docker exec -it <redis-container-name> redis-cli
  ```
- Or a GUI if preferred: **RedisInsight** — [https://redis.io/insight/](https://redis.io/insight/)

## 8. Git

- Download: [https://git-scm.com/downloads](https://git-scm.com/downloads) (skip if already installed).
- Verify:
  ```bash
  git --version
  ```

## 9. An IDE

Pick one:
- **IntelliJ IDEA Community Edition** (free, recommended for the Spring Boot side): [https://www.jetbrains.com/idea/download/](https://www.jetbrains.com/idea/download/)
- **VS Code** (works fine for both backend and frontend, lighter weight): [https://code.visualstudio.com/](https://code.visualstudio.com/)
  - If using VS Code for the backend, install the "Extension Pack for Java" and "Spring Boot Extension Pack" extensions.

## 10. opencode itself

- Follow opencode's own install instructions for your platform (not covered here since that's tool-specific and may change).

## 11. API testing tool (optional but very helpful for the acceptance-criteria checks in BUILD_PROMPT.md)

Pick one:
- **Postman**: [https://www.postman.com/downloads/](https://www.postman.com/downloads/)
- **Insomnia**: [https://insomnia.rest/download](https://insomnia.rest/download)
- Or just use `curl` from the terminal — no install needed, examples in BUILD_PROMPT.md assume you can run basic `curl` commands.

---

## Quick all-in-one verification

Once everything above is installed, run this block and confirm every line prints a version (no "command not found" errors):

```bash
java -version
mvn -version
node -v
npm -v
ng version
docker -v
docker compose version
git --version
```

If all of those succeed, you're ready to start Phase 1 in `BUILD_PROMPT.md`.

## Platform-specific notes

- **macOS:** almost everything above is installable via Homebrew (`brew install openjdk@17 maven node docker git`) except Docker Desktop and Angular CLI (install Docker Desktop separately, then `npm install -g @angular/cli` after Node is installed).
- **Windows:** use the official installers linked above; ensure Docker Desktop is configured to use WSL2 backend if prompted, and run terminal commands from either WSL2 or PowerShell consistently (don't mix).
- **Linux:** use your distro's package manager where available (e.g., `apt install openjdk-17-jdk maven`), and follow Docker's official install docs for your distro since the Docker Desktop GUI isn't the standard path on Linux — Docker Engine + Compose plugin is.
