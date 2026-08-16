# Deploying to a live VPS (single-school pilot)

This covers taking the app from local development to a real, internet-reachable
deployment on a VPS you control (e.g. Hostinger), for a live school to test
against. It uses Docker Compose: one container for Postgres, one for the API,
and one Caddy container that serves the built frontend and reverse-proxies
`/api` — Caddy also handles HTTPS automatically via Let's Encrypt.

Payments and SMS are intentionally left manual/stubbed for this pilot (see
README → "Known limitations / roadmap"): staff record fee payments by hand
(cash/bank transfer), and notifications are in-app only for now.

## 1. Prerequisites

- A VPS running Linux, with Docker and the Docker Compose plugin installed.
  Check with:
  ```bash
  docker --version
  docker compose version
  ```
  If either is missing, install Docker via your distro's official
  instructions (e.g. `curl -fsSL https://get.docker.com | sh` on most distros).
- A domain (or subdomain) with an **A record pointing at this VPS's public
  IP**. Caddy needs this to already resolve correctly before it can issue a
  certificate — check with `dig +short school.yourdomain.com` from another
  machine.
- Firewall/security group open on ports **80** and **443** (and 22 for SSH).
  Port 4000 (the API) and 5432 (Postgres) do **not** need to be exposed
  publicly — Caddy talks to them over the internal Docker network.

## 2. Get the code onto the VPS

```bash
git clone <your-repo-url> dafsolt-consult
cd dafsolt-consult
git checkout claude/school-management-cbt-saas-30jc3p   # or main, once merged
```

## 3. Configure secrets

```bash
cp .env.production.example .env
```

Edit `.env` and fill in real values:

- `DOMAIN` — the real domain/subdomain from step 1.
- `POSTGRES_PASSWORD` — a strong password (this stays internal to the Docker
  network, but treat it as a real secret).
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — generate two **different**
  random secrets:
  ```bash
  openssl rand -base64 48
  ```
- `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` — the platform admin account
  the server creates automatically on first boot (see step 5). This is the
  *platform* account (manages schools/subscriptions across the whole SaaS),
  not the pilot school's own admin — that gets created next, via onboarding.

Never commit `.env` — it's already gitignored.

## 4. Build and start the stack

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

First boot will:
1. Start Postgres and wait for it to report healthy.
2. Build and start the API container, which runs `prisma migrate deploy`
   automatically before starting the server, and creates the `SUPER_ADMIN`
   account from your `.env` if one doesn't already exist.
3. Build and start the Caddy container, which serves the frontend and
   requests a Let's Encrypt certificate for `DOMAIN` on first request.

Watch it come up:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

Look for `DAFSOLT OS API listening on port 4000 [production]` from
the `server` container. Visiting `https://school.yourdomain.com` should load
the login screen within a minute or two (certificate issuance takes a
moment the very first time).

## 5. Create the real pilot school

Do **not** run the demo seed script in production — it creates a fake "Demo
Academy" with placeholder logins. Instead, visit:

```
https://school.yourdomain.com/onboard
```

and register the actual pilot school there. That creates the tenant and its
first `SCHOOL_ADMIN` account in one step, with a 30-day trial by default.
Once you're ready to onboard for real, sign in as the `SUPER_ADMIN` (the
account from `.env`) at `/login`, go to **Schools**, and move that school's
plan/subscription status to `ACTIVE`.

From there, the school admin can:
- create academic sessions/terms, class levels/arms, and subjects (Classes
  & Subjects page)
- admit students and add guardians (with optional Parent Portal logins)
- add teaching staff (Staff page)
- build the CBT question bank and exams, post assignments, set up fee
  structures, and post announcements/calendar events

## 6. Password resets (until real email is wired up)

Every role (Super Admin, School Admin, Teacher, Student, Parent, Librarian,
Accountant) can request a reset at `/forgot-password`. Since a real email/SMS
provider isn't integrated yet, the actual reset link isn't emailed — it's
logged server-side instead:

```bash
docker compose -f docker-compose.prod.yml logs server | grep "password reset"
```

You'll see a line like:

```
[password reset] TEACHER <name@example.com> requested a reset: https://school.yourdomain.com/reset-password?token=...
```

Copy that link and relay it to the user manually (WhatsApp, SMS, in person)
for this pilot. The link expires after 1 hour and can only be used once;
resetting a password also signs that account out of every other device.
Wiring up a real provider later is a one-line change at the `console.log`
call site in `server/src/modules/auth/auth.service.ts`
(`requestPasswordReset`) — swap it for an actual email/SMS send.

## 7. Updating after a code change

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

This rebuilds only the images that changed and applies any new Prisma
migrations automatically on the API container's next start. Existing data in
Postgres and uploaded files persist across rebuilds (they live in named
Docker volumes, not inside the containers).

## 8. Backups

Postgres data lives in the `dafsolt_pgdata_prod` volume. Take a logical
backup regularly:

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup-$(date +%F).sql
```

Copy that file off the VPS (e.g. to S3, or just `scp` it somewhere) — a
backup that only lives on the same disk as the database doesn't protect you
from a disk failure.

## 9. Troubleshooting

- **Caddy can't get a certificate**: almost always DNS — confirm `DOMAIN` in
  `.env` resolves to this VPS's IP, and that ports 80/443 are actually open
  (`sudo ufw status` or your provider's firewall/security group settings).
- **API container keeps restarting**: check `docker compose -f
  docker-compose.prod.yml logs server` — the most common cause is a wrong
  `DATABASE_URL`/Postgres credential mismatch, or Postgres not yet healthy
  (the `depends_on: condition: service_healthy` should prevent this, but
  worth checking first).
- **Login works but pages show 401/redirect loops**: usually a stale
  `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` after being changed — this
  invalidates all existing sessions, so just log in again.
