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
  can create additional, fully separate workspaces for themselves (reusing the same email/password),
  switch between all of them instantly from a dropdown in the header (no re-entering a password) or
  from **Workspaces** in the navigation, set one as their default so login goes straight there, and
  manage Manager/Staff/Viewer accounts within their own workspace.
- **Sign in with just email + password** — the login form never asks which workspace up front. If
  that email + password matches more than one account (e.g. an Administrator of several
  workspaces, or someone who's both a workspace user and the Super Admin), a quick "continue as…"
  step lists only the accounts it's actually valid for, with an optional "remember this as my
  default" so it's skipped next time.
- **Self-service sign-up + setup wizard** — anyone can create their own workspace from `/signup`
  (workspace name, their name, email, password) without needing an invite (this page can be
  disabled per-deployment via `ALLOW_SELF_SIGNUP=false`, so only the Super Admin creates
  workspaces — see "Environment variables"). They're signed in automatically and walked through
  a 5-step **setup wizard** (`/setup`): currency, first apartment, first room, water/electricity
  utility rates, then a summary of what was configured.
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

### Production build (without Docker)

`npm run dev` is only for local development (unoptimized, hot-reloading). For a real
deployment, build the app once and run the optimized production server instead:

**1. Set production environment variables.** Don't reuse the local dev `.env` — it has a
placeholder `AUTH_SECRET` meant only for `npm run dev`. Create a separate `.env.production`
(or set real environment variables on the host) with:

```
DATABASE_URL="file:./prod.db"
AUTH_SECRET="<generate a long random string>"
NEXTAUTH_URL="https://your-domain.com"
```

Generate `AUTH_SECRET` in PowerShell:

```powershell
$bytes = New-Object byte[](32)
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

**2. Install dependencies and apply database migrations non-interactively.**

```powershell
npm ci
npm run db:migrate:deploy
```

**3. Build the optimized production bundle.**

```powershell
npm run build
```

**4. Start the production server.** `next start` (unlike `next dev`) runs the compiled,
optimized build — no hot-reload, no dev overlay:

```powershell
npm run start
```

By default this listens on port `3000` on all interfaces. To use a different port, either
set the `PORT` environment variable or pass `-- -p <port>`:

```powershell
$env:PORT = 8080
npm run start
```

**5. Keep it running.** `npm run start` runs in the foreground and stops if the terminal
closes or the process crashes. For a real deployment, run it under a process manager that
restarts it automatically and starts it on boot — e.g. [pm2](https://pm2.keymetrics.io/):

```powershell
npm install -g pm2
pm2 start npm --name rentalhrm -- run start
pm2 save
```

Prefer an isolated, reproducible deployment instead? See "Docker deployment" below — it
wraps all of the steps above (migrations, build, start, restart policy) into a single
`docker compose up`.

### Creating the Super Admin account (production)

The Super Admin is the one account that belongs to no workspace and can see/manage every
workspace on the platform (see "Demo accounts" below for what it can do). There's no
`/signup` for it — self-service signup only creates workspace **Administrators**. `npm run
db:seed` does create a Super Admin, but with a hardcoded demo password and a pile of
unrelated sample data, so it's dev/demo-only and unsuitable for production.

Instead, use `prisma/create-super-admin.ts` (via `npm run db:create-super-admin`), which
only ever touches the Super Admin account and always requires a real name/email/password
supplied through environment variables — nothing hardcoded, no demo data:

```powershell
$env:SUPER_ADMIN_NAME = "Jane Doe"
$env:SUPER_ADMIN_EMAIL = "jane@example.com"
$env:SUPER_ADMIN_PASSWORD = "<a strong, unique password>"
npm run db:create-super-admin
```

Run this once after `npm run db:migrate:deploy` has created the database schema. Sign in
at `/login` with the email/password above — since that email isn't used anywhere else, you'll
go straight in with no extra step.

Re-running the command with the same email updates that Super Admin's name/password
instead of creating a duplicate, so it also works as a password-reset tool if you ever
need to rotate the credentials.

### Demo accounts (created by `npm run db:seed`) — or start fresh at `/signup`

RentalHRM is multi-tenant: every account except the Super Admin belongs to a **workspace**
(a fully isolated "system" with its own apartments, users, and settings).

You don't have to seed demo data to try the app — open
[http://localhost:3000/signup](http://localhost:3000/signup) to create your own workspace
and administrator account, then follow the setup wizard (unless `/signup` has been disabled
via `ALLOW_SELF_SIGNUP=false` — see "Environment variables" below — in which case a Super
Admin must create workspaces from `/super-admin` instead). If you'd rather explore with
ready-made sample data instead, run `npm run db:seed` and use these accounts — just email +
password, no workspace to pick since none of these emails are reused elsewhere:

| Role          | Email               | Password    |
| ------------- | -------------------- | ----------- |
| Super Admin   | superadmin@hrm.local | SuperAdmin123! |
| Administrator | admin@hrm.local      | Admin123!   |
| Manager       | manager@hrm.local    | Manager123! |
| Staff         | staff@hrm.local      | Staff123!   |
| Viewer        | viewer@hrm.local     | Viewer123!  |

- **Super Admin** signs in the same way as everyone else — just email + password. They see every
  workspace on the platform (Settings are replaced by a `/super-admin` area), can create new
  workspaces (each with its own first administrator), and can click **Enter workspace** on any
  workspace's detail page to work inside it exactly like its Administrator — full view/modify
  access, with a banner and one-click **Exit to Super Admin** to leave.
- Every other role signs in with just their email and password too. If that email + password is
  valid for more than one account (e.g. an Administrator who's created several workspaces for
  themselves, or someone who happens to be both the Super Admin and a workspace user), a quick
  "continue as…" step lists only the matching accounts — with an optional "remember this as my
  default workspace" so it's skipped on future logins. Once signed in, switch workspaces anytime
  from the dropdown in the header or from **Workspaces** in the navigation — no password needed
  again, since it's only ever offering accounts already proven valid at sign-in.
- An Administrator can create additional, fully separate workspaces for themselves from
  **Workspaces** in the navigation — it appears in the switcher immediately, no need to log out
  and back in.
- Within a workspace, an Administrator can create Manager/Staff/Viewer (and other
  Administrator) accounts from **Users**, and fine-tune exactly what each role can do from
  **Roles & permissions**.

## Environment variables

Copy `.env` (already included with sane local defaults) and adjust for production:

```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="<generate a long random string>"
NEXTAUTH_URL="https://your-domain.com"
ALLOW_SELF_SIGNUP="true"
```

- `ALLOW_SELF_SIGNUP` — controls whether the public `/signup` page (self-service
  workspace + administrator creation) is reachable. Defaults to **enabled** when unset.
  Set to `"false"` to disable it entirely — the "Create your workspace" link disappears
  from `/login` and `/signup` itself redirects away — so the only way to create a
  workspace is via the Super Admin's **New workspace** button in `/super-admin`, making
  every user in the system one the Super Admin explicitly created.

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
- `ALLOW_SELF_SIGNUP` — defaults to `false` in this template, so the public `/signup`
  page is disabled and the Super Admin is the only one who can create workspaces. Set to
  `true` if you want to allow anyone to create their own workspace instead.


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

**4. Create the Super Admin account.** This is the platform-wide account (see "Creating
the Super Admin account (production)" above) — there's no hardcoded default in the
container, so create one with a real password using `docker compose exec` and `-e` to
pass the credentials in:

```powershell
docker compose --env-file .env.docker exec `
  -e SUPER_ADMIN_NAME="Jane Doe" `
  -e SUPER_ADMIN_EMAIL="jane@example.com" `
  -e SUPER_ADMIN_PASSWORD="<a strong, unique password>" `
  app npx tsx prisma/create-super-admin.ts
```

**5. Open the app** at the URL you set in `NEXTAUTH_URL`. Sign in as the Super Admin you
just created (just email + password — no workspace to pick) to create/manage workspaces, or go
to `/signup` to create a regular workspace + Administrator and walk through the setup wizard. If
you'd rather explore with ready-made sample data instead, seed the demo accounts (hardcoded demo
passwords — never do this in a real deployment):

```powershell
docker compose --env-file .env.docker exec app npx prisma db seed
```

then sign in with the demo accounts listed above.

**6. Stop it** (data is preserved in the volumes):

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
- `npm run db:create-super-admin` — create (or reset the password of) the platform Super
  Admin account from `SUPER_ADMIN_NAME`/`SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` env vars
  (safe for production — see "Creating the Super Admin account (production)" above).
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
- `src/lib/login-candidates.ts` — `findLoginCandidates()`, the single source of truth for "which
  account(s) does this email + password resolve to", used by both the login form and `auth.ts`.
- `src/lib/actions/workspace-switch.ts` — `switchWorkspaceAction()` / `setDefaultWorkspaceAction()`,
  backed by `unstable_update()` so switching never needs a password again.
- `src/lib/currency.ts`, `src/lib/attention.ts`, `src/lib/qrcode.ts`, `src/lib/pagination.ts` —
  per-workspace currency conversion, dashboard "needs attention" queries, QR code generation, and
  shared pagination helpers.
- `src/app/(app)/*` — the authenticated, workspace-scoped app (dashboard, apartments, rooms,
  utilities, payments, logs, settings incl. users/roles/currency/workspaces, and the `/setup`
  onboarding wizard) sharing a top-nav layout with breadcrumbs.
- `src/app/super-admin/*` — the platform-wide area only the Super Admin can reach (list/create
  workspaces, enter a workspace, view its users, enable/disable a workspace).
- `src/app/login` — the sign-in page (outside the app shell). Just Email/Password; if that combo
  resolves to more than one account, `LoginForm.tsx` shows a "continue as…" step in place.
- `src/app/signup` — the public, self-service "create your workspace" page.
- `Dockerfile` / `docker-compose.yml` / `docker-entrypoint.sh` — production container build
  (multi-stage: full deps to build, prod-only deps to run) and startup (applies pending
  migrations, then starts the server). See "Docker deployment" above.
