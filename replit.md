# PennReach

## Overview
PennReach is a full-stack web application for MBA students to manage alumni cold outreach. It helps users upload professional profiles (LinkedIn PDFs, text), find work emails via Hunter.io, and generate AI-personalized outreach emails using built-in Replit AI (OpenAI-compatible).

## Project Architecture
- **Frontend**: React + Vite + Tailwind CSS v4, served on port 5000
- **Backend**: Node.js + Express on port 3001
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: bcryptjs + JWT (HttpOnly cookies)
- **AI**: Replit AI Integration (OpenAI SDK, gpt-5.2 model) — no user API key needed
- **Email Lookup**: Hunter.io API (user-provided key)
- **Gmail/Calendar**: Google OAuth 2.0 (gmail.send, gmail.compose, calendar.readonly scopes)

## Project Structure
```
pennreach/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # Layout, reusable UI
│   │   ├── pages/          # Login, Signup, Onboarding, Dashboard, NewContact, ContactDetail, Settings
│   │   ├── hooks/          # useAuth
│   │   ├── lib/            # api.js fetch wrapper
│   │   ├── App.jsx         # Router setup
│   │   └── main.jsx        # Entry point
│   ├── vite.config.js      # Vite config (proxy /api to :3001)
│   └── package.json
├── server/                 # Express backend
│   ├── routes/             # auth, user, contacts, drafts, gmail, calendar
│   ├── services/           # ai.js (OpenAI/Replit AI), hunter.js (Hunter.io)
│   ├── middleware/         # auth.js (JWT), upload.js (multer)
│   ├── prisma/schema.prisma
│   ├── index.js            # Express entry
│   └── package.json
├── docs/                   # Project documentation
└── package.json            # Root with dev scripts
```

## Development
- **Dev command**: `npx concurrently "cd server && node index.js" "cd client && npx vite --host 0.0.0.0 --port 5000"`
- Frontend dev server on port 5000 proxies `/api` requests to backend on port 3001
- Production: Build client (`cd client && npm run build`), Express serves static files from `client/dist`

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection (auto-provided by Replit)
- `JWT_SECRET` - JWT signing secret
- `ENCRYPTION_KEY` - For encrypting API keys in DB
- `AI_INTEGRATIONS_OPENAI_API_KEY` - Replit AI integration key (auto-provided)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - Replit AI integration base URL (auto-provided)
- User-specific API keys: Only Hunter.io stored per user in database

## Environment Variables (Google OAuth)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (user must set)
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret (user must set)
- `GOOGLE_REDIRECT_URI` - OAuth callback URL (auto-set to app domain)

## Recent Changes
- 2026-02-08: P0-6: Multi-file drag & drop upload in NewContact — supports dropping/selecting multiple PDFs and images, file list with type icons and remove buttons, combined parsing
- 2026-02-08: P0-10: Gmail & Google Calendar OAuth integration — Connect/Disconnect in Settings, Create Gmail Draft and Send via Gmail in NewContact, Calendar free-slots for availability
- 2026-02-08: Onboarding name fields restructure — split Full Name into First/Last Name, added preferred name checkbox, Layout greeting uses displayName
- 2026-02-08: Migrated AI from Anthropic Claude (user API key) to Replit AI Integration (OpenAI SDK, built-in, no user key needed)
- 2026-02-08: Removed Anthropic API key fields from Onboarding and Settings pages
- 2026-02-08: Updated ai.js service to use OpenAI SDK with gpt-5.2 model
- 2026-02-08: Initial project build from documentation specs
