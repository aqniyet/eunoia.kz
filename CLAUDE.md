# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EUNOIA.kz is a Kazakhstan-based fintech company offering instant payouts (B2B2C) via Kazakhstan's SMP (instant payment system). The public site is currently in **maintenance mode** — `index.html` is a "Project on hold" page.

Besides the static site, the repo contains a **primitive webmail portal** for @eunoia.kz mail: `/login`, `/register` (invite-code gated), `/mail`, backed by `server/` (Node/Express API).

## Hosting & Deployment (since 2026-06-07)

Hosted on a VPS (82.115.48.95 — the same box that runs docker-mailserver for mail.railclerk.com), **not** GitHub Pages. Stack at `/opt/eunoia` on the host:

- **Caddy** (`eunoia-caddy`) serves `/opt/eunoia/site` with auto-HTTPS and proxies `/api/*` → `api:3000`. Pretty URLs via `try_files {path} {path}.html`.
- **API** (`eunoia-api`) built from `server/`.

Pushing to `main` deploys via `.github/workflows/deploy.yml`: rsync of the static files → `/opt/eunoia/site/`, rsync of `server/` → `/opt/eunoia/server/`, then `sudo eunoia-redeploy` (the only command the deploy key may sudo) rebuilds containers.

**`deploy/Caddyfile` and `deploy/docker-compose.yml` are NOT applied by CI.** They are the source of truth for `/opt/eunoia/{Caddyfile,docker-compose.yml}` but must be copied to the host manually (ssh as ubuntu) — this keeps root-level infra out of the deploy key's reach. Secrets live in `/opt/eunoia/.env` (root 600, never in git): `SESSION_SECRET`, `INVITE_CODE`, `MAIL_HOST`, `MAIL_DOMAIN`.

GitHub Pages artifacts (`CNAME`, `.nojekyll`, `eunoia.kz/`) are legacy and excluded from deploys.

## Webmail architecture — intentionally primitive

- **No database.** The docker-mailserver accounts file (`postfix-accounts.cf`, bind-mounted into the API container at `/mailcfg`) is the user store; **IMAP login is authentication**.
- Registration appends `user@eunoia.kz|{SHA512-CRYPT}hash` to that file (append-only — it also holds other domains' mailboxes; never rewrite it). The mailserver's changedetector picks new accounts up within seconds.
- Sessions are in-memory; the IMAP password lives in a server-side Map keyed by session ID, never in the cookie. Restart = everyone signed out (accepted).
- Mail reading returns **plain text only** (HTML stripped, never rendered) — closes HTML-mail XSS.
- Sending: SMTP submission :587 with the user's own credentials; a copy is appended to the Sent folder.
- Registration is gated by `INVITE_CODE` and a reserved-name blocklist (postmaster, admin, info, …). Login/register are rate-limited.

## Key Technical Details

- **No build system** for the site — hand-written HTML/CSS/JS. The API (`server/`) is plain Node ESM, no transpilation.
- **Design system**: dark theme CSS custom properties — `--bg: #0a0a0c`, `--accent: #c8ff2e`, Syne (headings) + DM Sans (body). Portal pages share `css/portal.css`.
- **Analytics**: Google Analytics `G-ZNMX4CYVY7` (maintenance page only).
- **Bilingual** (RU/EN) on the old full site via `switchLang()`; the maintenance and portal pages are EN-only.

## PDF Generation

```bash
pip install weasyprint
python generate_pdf.py
```
