# Webhook Dashboard — Build Instructions

## Overview

Production-ready webhook dashboard built on:
- Cloudflare Workers (API + serving)
- Cloudflare D1 (SQLite database)
- React + Vite (frontend)
- TailwindCSS v4
- Wrangler (deployment)

---

## Core Features

### 1. Webhook Receiver

Endpoint: `POST /api/:app-name/webhook`

- Accepts JSON payloads
- Validates app name exists in database
- Stores: id, event_type, payload, headers, created_at
- Reads event type from `x-event-type` header or body field
- Returns JSON success response
- 1 MB payload size limit
- Auto-prunes: keeps only 100 most recent events per app

### 2. Events API

Endpoint: `GET /api/:app-name/events`

- Validates app name exists
- Returns latest 100 events ordered DESC by created_at
- JSON response

### 3. Apps API

Endpoint: `GET /api/apps/:slug` — check if app exists  
Endpoint: `POST /api/apps` — create new app (body: `{ name: string }`)

### 4. Dashboard UI

`GET /` — Welcome page with app name input + Get Started / Create New App  
`GET /:app-name` — Dashboard with events table

Dashboard includes:
- Sticky table header (ID, Event Type, Created At)
- Accordion row expansion (payload JSON + headers JSON)
- Auto-refresh: 20s / 30s / 60s options
- Manual refresh button
- Copy JSON button
- Row count indicator
- Last refresh timestamp
- Loading and empty states
- Smooth animations

---

## Database Schema

### webhook_apps
| Column | Type |
|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT |
| name | TEXT NOT NULL |
| slug | TEXT NOT NULL UNIQUE |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP |

### webhook_events
| Column | Type |
|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT |
| app_id | INTEGER NOT NULL (FK → webhook_apps.id) |
| event_type | TEXT |
| payload | TEXT (JSON) |
| headers | TEXT (JSON) |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP |

---

## Project Structure

```
webhook/
├── migrations/
│   └── 0001_initial.sql
├── worker/
│   ├── index.ts           # Main Worker entry + router
│   ├── db.ts              # D1 database operations
│   └── handlers/
│       ├── apps.ts        # App check + create
│       ├── events.ts      # Events listing
│       └── webhook.ts     # Webhook receiver
├── src/
│   ├── main.tsx           # React entry + BrowserRouter
│   ├── App.tsx            # Client-side routes
│   ├── index.css          # Tailwind v4 + custom styles
│   ├── pages/
│   │   ├── Home.tsx       # Welcome / app lookup page
│   │   └── Dashboard.tsx  # Events dashboard
│   └── components/
│       ├── EventsTable.tsx # Table + accordion
│       └── JsonViewer.tsx  # Pretty JSON with copy
├── wrangler.jsonc
├── package.json
└── INSTRUCTIONS.md
```

---

## Local Development

```bash
# Install dependencies
yarn install

# Create D1 database (first time only)
npx wrangler d1 create webhook_db
# Copy the returned database_id into wrangler.jsonc → d1_databases[0].database_id

# Apply migrations locally
npx wrangler d1 migrations apply webhook_db --local

# Run dev server
yarn dev
```

## Deployment

```bash
# Build + deploy
yarn deploy

# Apply migrations on remote
npx wrangler d1 migrations apply webhook_db
```

---

## Technical Requirements

- ES Modules
- Modular, readable code
- Minimal dependencies
- Safe JSON parsing
- Proper HTTP status codes
- Defensive error handling
- async/await throughout
- No XSS vulnerabilities
- Request size limit (1 MB)
- Web Crypto only (no Math.random for IDs)

## UI/UX Design Principles

Inspired by Stripe Logs, Vercel Logs, GitHub webhook inspection:
- Sticky table header
- Hover states on rows
- Loading + empty states
- Smooth accordion animation
- Readable typography
- Consistent spacing
- Rounded containers
- Subtle shadows
- Dark-friendly neutral theme
