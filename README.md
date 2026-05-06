# Webhook Dashboard

A production-ready webhook inspection dashboard built on Cloudflare Workers, D1, React, and TailwindCSS v4.

Inspired by Stripe Logs, Vercel Logs, and GitHub webhook inspection tools.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Frontend | React 19 + Vite |
| Styling | TailwindCSS v4 |
| Routing | React Router v7 |
| Deployment | Wrangler |

---

## Features

- **Webhook receiver** — `POST /api/:app-name/webhook` accepts JSON payloads, reads event type from `x-event-type` header or request body
- **Events dashboard** — sticky table with ID, event type, and timestamp columns
- **Accordion rows** — click any row to expand payload JSON and request headers inline
- **Auto-refresh** — configurable polling at 20s / 30s / 60s without full page reload
- **Manual refresh** — refresh button with loading indicator
- **Copy JSON** — one-click copy for both payload and headers
- **Row count + last updated** — visible in the dashboard toolbar
- **App management** — create and look up apps by slug from the home page
- **Auto-pruning** — keeps only the 100 most recent events per app

---

## Project Structure

```
webhook/
├── migrations/
│   └── 0001_initial.sql       # D1 schema: webhook_apps + webhook_events
├── worker/
│   ├── index.ts               # Worker entry point + URL router
│   ├── db.ts                  # D1 database operations
│   └── handlers/
│       ├── apps.ts            # GET /api/apps/:slug, POST /api/apps
│       ├── events.ts          # GET /api/:slug/events
│       └── webhook.ts         # POST /api/:slug/webhook
├── src/
│   ├── main.tsx               # React entry + BrowserRouter
│   ├── App.tsx                # Client-side routes
│   ├── index.css              # Tailwind v4 + accordion styles
│   ├── pages/
│   │   ├── Home.tsx           # App name lookup / create page
│   │   └── Dashboard.tsx      # Events dashboard + toolbar
│   └── components/
│       ├── EventsTable.tsx    # Table with accordion row expansion
│       └── JsonViewer.tsx     # Syntax-highlighted JSON + copy button
├── wrangler.jsonc
├── INSTRUCTIONS.md            # Full feature spec + design decisions
└── package.json
```

---

## Getting Started

### 1. Install dependencies

```bash
yarn install
```

### 2. Create the D1 database

```bash
npx wrangler d1 create webhook_db
```

Copy the `database_id` from the output and update `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "webhook_db",
    "database_id": "<your-database-id-here>",
    "migrations_dir": "migrations"
  }
]
```

### 3. Apply migrations locally

```bash
npx wrangler d1 migrations apply webhook_db --local
```

### 4. Start the dev server

```bash
yarn dev
```

---

## Deployment

```bash
# Apply migrations on remote D1
npx wrangler d1 migrations apply webhook_db

# Build and deploy
yarn deploy
```

---

## API Reference

### Check if an app exists
```
GET /api/apps/:slug
```
Returns `200` with app data, or `404` if not found.

### Create a new app
```
POST /api/apps
Content-Type: application/json

{ "name": "my-app" }
```
Returns `201` with the created app. Returns `200` if the slug already exists.

### Send a webhook
```
POST /api/:slug/webhook
Content-Type: application/json
X-Event-Type: payment.succeeded   (optional)

{ ...your payload... }
```
Stores the event and returns `{ "success": true }`.

### List events
```
GET /api/:slug/events
```
Returns the latest 100 events ordered by `created_at DESC`.

---

## Security

- Payloads are capped at **1 MB**
- `Authorization` and `Cookie` headers are stripped before storage
- All JSON is HTML-escaped before rendering (no XSS)
- Uses `crypto.randomUUID()` — no `Math.random()`

---

## Development Notes

- Run `yarn cf-typegen` after changing bindings in `wrangler.jsonc` to regenerate `worker-configuration.d.ts`
- The React SPA is served via the `ASSETS` binding; all `/api/*` routes are handled by the Worker
- Tailwind v4 requires no config file — configured entirely via `@tailwindcss/vite` plugin
