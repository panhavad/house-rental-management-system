# RentalHRM — Rental House Management

A lightweight Next.js web app for managing rental apartments and rooms: tenants, contracts,
monthly utility consumption (water & electricity), rent + utility payments, and a full activity
history — with role-based access control.

## Tech stack

- **Next.js 16** (App Router, Server Components, Server Actions, Turbopack)
- **TypeScript**, **Tailwind CSS 4**, **lucide-react** icons
- **Prisma 6** + **SQLite** (single-file database, zero external setup)
- **NextAuth v5 (Auth.js)** with the Credentials provider + JWT sessions, workspace-aware login
- **qrcode** (server-side QR generation) + **html5-qrcode** (browser camera scanning)
- Installable **PWA** (web app manifest + service worker)
- **Docker-ready** — multi-stage `Dockerfile` + `docker-compose.yml` for production deployment

## Features

- **Multi-tenant workspaces** — the whole app is organized into isolated **workspaces**, each
  with its own apartments, users, currency, facilities, rates and permissions. A **Super Admin**
  (no workspace of their own) can see every workspace from a dedicated `/super-admin` area,
  create new workspaces with their first administrator, enable/disable a workspace, and **enter**
  any workspace to view and manage it exactly like that workspace's Administrator (a banner
  makes it obvious when they're doing this, with a one-click "Exit to Super Admin"; every action
  taken this way is still attributed to the Super Admin in the activity log). An **Administrator**
  can create additional, fully separate workspaces for themselves (reusing the same email/password
  — switching is just entering a different workspace name at login) and manage Manager/Staff/Viewer
  accounts within their own workspace.
- **Self-service sign-up + setup wizard** — anyone can create their own workspace from `/signup`
  (workspace name, their name, email, password) without needing an invite. They're signed in
  automatically and walked through a 5-step **setup wizard** (`/setup`): currency, first
  apartment, first room, water/electricity utility rates, then a summary of what was configured.
  Every step can be skipped and finished later — a banner reminds the Administrator to finish
  setup until they do.
- **Apartments** — create/edit apartment buildings, an optional map link (opens the location in
  a new tab), see all rooms and how many people currently live there.
- **Rooms** — size, type, floor, floor plan link, facilities (AC, kitchen, Wi-Fi, ...), rental fee,
  status (vacant / occupied / maintenance).
- **Contracts** — start a contract (tenant, occupant count, deposit, rent, period), end it, or
  terminate it early with a reason. Full contract history is kept per room, including multiple
  attached contract documents (PDF or image) with small, low-quality thumbnails for fast loading.
- **Utility consumption** — record monthly water & electricity meter readings per room. Usage is
  automatically multiplied by the current per-unit rate to compute the monthly utility cost.
  Each room has a printable **QR code** that deep-links straight to its reading form, and a
  **Scan QR** button opens the device camera to jump to the right room instantly.
- **Multi-currency display** — an administrator can switch their workspace between USD and
  Cambodian Riel (KHR); all amounts are stored in USD and converted for display using a
  configurable exchange rate.
- **Payments** — rent + utility cost are combined automatically into one payment per room/month.
  A dedicated Payments page lets you filter, generate missing invoices, and mark payments as
  paid/overdue.
- **Dashboard reminders** — a "Needs attention" section (and a header notification badge) surfaces
  overdue payments, rooms missing this month's utility reading, and contracts expiring within 30
  days, each linking straight to the fix.
- **Activity log** — every create/update/delete, contract change, utility entry and payment status
  change is recorded with who did it and when, filterable by entity type or room.
- **Access control** — a 5-tier role hierarchy (`Super Admin → Admin → Manager → Staff →
  Viewer`), with a fully **customizable permission matrix** per workspace: an administrator can
  check/uncheck exactly what Manager/Staff/Viewer can do from **Settings → Roles & permissions**
  (Administrators always keep full access, so it's impossible to lock every admin out). Every
  signed-in user has a **"My access"** page explaining exactly what their role can and cannot do.
- **Navigation** — breadcrumbs on every page, a horizontal top nav bar on desktop and an
  always-visible icon strip on mobile (both highlight the right section even on sub-pages), and a
  version/release-date footer.
- **Mobile-friendly & installable** — responsive card layouts for tables on small screens, a 2×2
  stat grid on the dashboard, and a web app manifest + service worker so the app can be installed
  to a phone's home screen ("Add to Home Screen" / PWA install).
- **Pagination** — every list view is paginated (10/30/50/100 rows per page, remembered per
  browser via a cookie) so pages stay fast even with a lot of data.

## Getting started

### Prerequisites

- Node.js and npm installed.
- Windows PowerShell opened as your normal user.
- Docker Desktop (only if you plan to deploy via Docker — see "Docker deployment" below).

### First-time setup (Windows PowerShell)

```powershell
Set-Location C:\Project\hrm

# Run once if PowerShell reports that npm.ps1 cannot be loaded.
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force

# Verify Node.js and npm are available.
node --version
npm --version

# Install the project dependencies.
npm install

# Prepare and seed the local SQLite database.
npm run db:migrate
npm run db:seed

# Start the development server.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`.

The execution-policy command changes only the current Windows user's policy. If you cannot
change that policy, run npm through `npm.cmd` instead:

```powershell
npm.cmd install
npm.cmd run dev
```

### Daily development

The quickest way to start working: one command handles the execution-policy fix,
installs dependencies if missing, applies migrations/seed if the database doesn't
exist yet, then starts the dev server.

```powershell
npm run start:project
```

Or, if setup is already done, just:

```powershell
npm run dev
```

Press `Ctrl+C` in the terminal to stop the development server.

### Cleaning build output

Removes generated/compiled files (`.next`, `*.tsbuildinfo`, `next-env.d.ts`) so the
project folder stays minimal. Safe to run any time — everything is regenerated on
the next `npm run dev` / `npm run build`.

```powershell
npm run clean
```

To also remove `node_modules` for a fully minimal checkout (you'll need `npm install`
again afterwards):

```powershell
npm run clean:all
```

### Production build

```powershell
npm run build
npm run start
```

### Demo accounts (created by `npm run db:seed`) — or start fresh at `/signup`

RentalHRM is multi-tenant: every account except the Super Admin belongs to a **workspace**
(a fully isolated "system" with its own apartments, users, and settings).

You don't have to seed demo data to try the app — open
[http://localhost:3000/signup](http://localhost:3000/signup) to create your own workspace
and administrator account, then follow the setup wizard. If you'd rather explore with
ready-made sample data instead, run `npm run db:seed` and use these accounts (logging in
as anything other than the Super Admin requires the workspace's login name as well as an
email/password):

| Role          | Workspace | Email               | Password    |
| ------------- | --------- | -------------------- | ----------- |
| Super Admin   | *(leave blank)* | superadmin@hrm.local | SuperAdmin123! |
| Administrator | default   | admin@hrm.local      | Admin123!   |
| Manager       | default   | manager@hrm.local    | Manager123! |
| Staff         | default   | staff@hrm.local      | Staff123!   |
| Viewer        | default   | viewer@hrm.local     | Viewer123!  |

- **Super Admin** signs in with the Workspace field left blank. They see every workspace on
  the platform (Settings are replaced by a `/super-admin` area), can create new workspaces
  (each with its own first administrator), and can click **Enter workspace** on any workspace's
  detail page to work inside it exactly like its Administrator — full view/modify access, with
  a banner and one-click **Exit to Super Admin** to leave.
- Every other role signs in with the **Workspace** login name (e.g. `default`) plus their
  email and password. An Administrator can create additional, fully separate workspaces for
  themselves from **Workspaces** in the navigation — switching workspace is just a matter of
  entering a different workspace name at login with the same email/password.
- Within a workspace, an Administrator can create Manager/Staff/Viewer (and other
  Administrator) accounts from **Users**, and fine-tune exactly what each role can do from
  **Roles & permissions**.

## Environment variables

Copy `.env` (already included with sane local defaults) and adjust for production:

```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="<generate a long random string>"
NEXTAUTH_URL="https://your-domain.com"
```

## Docker deployment

The app ships with a production-ready multi-stage `Dockerfile` and a `docker-compose.yml`
that persist the SQLite database and uploaded contract documents in named volumes, so
they survive image rebuilds and container restarts.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes the
  `docker compose` CLI) installed and running.

### Step-by-step

**1. Copy the Docker env template and fill in real values.**

```powershell
Copy-Item .env.docker.example .env.docker
```

Open `.env.docker` and set:

- `AUTH_SECRET` — a long random string. Generate one in PowerShell:

  ```powershell
  $bytes = New-Object byte[](32)
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  [Convert]::ToBase64String($bytes)
  ```

  (or `openssl rand -base64 32` if you have OpenSSL/Git Bash/WSL available).

- `NEXTAUTH_URL` — the public URL this deployment will be reached at (e.g.
  `http://localhost:3000` for local testing, or `https://your-domain.com` in production).
- `APP_PORT` — the host port to publish the app on (defaults to `3000`).

**2. Build and start the container.**

```powershell
docker compose --env-file .env.docker up -d --build
```

This builds the image, creates the `db-data` and `uploads-data` volumes, applies database
migrations automatically, and starts the app in the background.

**3. Check it's running.**

```powershell
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f app
```

**4. Open the app** at the URL you set in `NEXTAUTH_URL` and either go to `/signup` to
create your own workspace and walk through the setup wizard, or seed demo data first:

```powershell
docker compose --env-file .env.docker exec app npx prisma db seed
```

then sign in with the demo accounts listed above.

**5. Stop it** (data is preserved in the volumes):

```powershell
docker compose --env-file .env.docker down
```

### What the container does on every start

`docker-entrypoint.sh` runs `prisma migrate deploy` (safe, non-interactive — only applies
migrations that haven't run yet) before starting the server, so upgrading the image to a
newer version with schema changes just means rebuilding and restarting the container:

```powershell
docker compose --env-file .env.docker up -d --build
```

### Persistent data

Two named volumes are created automatically:

| Volume         | Mounted at              | Contains                                  |
| -------------- | ------------------------ | ------------------------------------------ |
| `db-data`      | `/app/data`               | the SQLite database file (`prod.db`)       |
| `uploads-data` | `/app/public/uploads`     | uploaded contract documents (PDF/images)   |

Back these up before upgrading in production:

```powershell
docker run --rm -v hrm_db-data:/data -v ${PWD}:/backup alpine tar czf /backup/db-backup.tar.gz /data
```

(adjust the `hrm_db-data` volume name prefix if your project folder isn't named `hrm`;
run `docker volume ls` to see the actual name).

### Useful Docker commands

All of these already use `--env-file .env.docker` under the hood, so they're the quickest
way to manage the deployment once `.env.docker` exists:

```powershell
npm run docker:build   # docker compose build
npm run docker:up      # docker compose up -d --build  (build + start/update)
npm run docker:logs    # docker compose logs -f app
npm run docker:seed    # seed demo data into the running container
npm run docker:down    # docker compose down  (stops containers, keeps volumes/data)
```

### Notes

- **Never reuse the local dev `.env`** for a real deployment — it contains a placeholder
  `AUTH_SECRET` meant only for `npm run dev` on your own machine. Always use a separate
  `.env.docker` with a freshly generated secret.
- The image installs OS packages (`openssl`, `libc6-compat`) required by Prisma's query
  engine and the `sharp` image-processing library on Alpine Linux — no extra setup needed.
- To deploy behind a reverse proxy / custom domain, just set `NEXTAUTH_URL` to the public
  URL; Auth.js is configured with `trustHost: true` so it works behind any hostname.

## Useful scripts

- `npm install` — install or update project dependencies.
- `npm run start:project` — one-shot setup + start (execution policy, install, migrate/seed if needed, dev server).
- `npm run dev` — start the dev server.
- `npm run build` / `npm run start` — production build & start.
- `npm run lint` — run ESLint.
- `npm run db:migrate` — run Prisma migrations (dev).
- `npm run db:migrate:deploy` — apply migrations non-interactively (used in Docker/production).
- `npm run db:seed` — re-seed demo data.
- `npm run db:studio` — open Prisma Studio to browse the database.
- `npm run clean` — remove compiled/build output (`.next`, `*.tsbuildinfo`, `next-env.d.ts`).
- `npm run clean:all` — same as `clean`, plus removes `node_modules`.
- `npm run docker:build` / `docker:up` / `docker:down` / `docker:logs` / `docker:seed` —
  thin wrappers around the equivalent `docker compose --env-file .env.docker` commands
  (see "Docker deployment" above).

## Project structure

- `prisma/schema.prisma` — data model: `Workspace` at the root, with `User`, `Apartment`,
  `Facility`, `UtilityRate`, `AppSetting`, `RolePermission` and `ActivityLog` scoped to it
  directly; `Room`/`Contract`/`Payment`/`UtilityReading`/`ContractDocument` scoped indirectly
  through their apartment.
- `prisma/seed.ts` — creates the Super Admin, the Default Workspace, and its demo users/data.
- `src/auth.ts` / `src/proxy.ts` — workspace-aware authentication config and route protection
  (including a safety net that force-clears an inconsistent/stale session instead of ever looping).
- `src/lib/rbac.ts` — permission matrix per role, customizable per workspace via `RolePermission`.
- `src/lib/auth-guard.ts` — `requireUser()` / `requireWorkspaceUser()` / `requireSuperAdmin()` /
  `requirePermission()` helpers used in pages & actions.
- `src/lib/workspace.ts` — workspace creation helpers (`createWorkspaceWithAdmin`,
  `createAdditionalWorkspace`, `getWorkspacesForAdminEmail`, slug generation).
- `src/lib/currency.ts`, `src/lib/attention.ts`, `src/lib/qrcode.ts`, `src/lib/pagination.ts` —
  per-workspace currency conversion, dashboard "needs attention" queries, QR code generation, and
  shared pagination helpers.
- `src/app/(app)/*` — the authenticated, workspace-scoped app (dashboard, apartments, rooms,
  utilities, payments, logs, settings incl. users/roles/currency/workspaces, and the `/setup`
  onboarding wizard) sharing a top-nav layout with breadcrumbs.
- `src/app/super-admin/*` — the platform-wide area only the Super Admin can reach (list/create
  workspaces, enter a workspace, view its users, enable/disable a workspace).
- `src/app/login` — the sign-in page (outside the app shell), with the Workspace/Email/Password
  fields.
- `src/app/signup` — the public, self-service "create your workspace" page.
- `Dockerfile` / `docker-compose.yml` / `docker-entrypoint.sh` — production container build
  (multi-stage: full deps to build, prod-only deps to run) and startup (applies pending
  migrations, then starts the server). See "Docker deployment" above.
