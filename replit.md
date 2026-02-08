# PennReach

## Overview
PennReach is a full-stack web application for MBA students to manage alumni cold outreach. It helps users upload professional profiles (LinkedIn PDFs, text), find work emails via Hunter.io, and generate AI-personalized outreach emails using Anthropic Claude.

## Project Architecture
- **Frontend**: React + Vite + Tailwind CSS v4, served on port 5000
- **Backend**: Node.js + Express on port 3001
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: bcryptjs + JWT (HttpOnly cookies)
- **AI**: Anthropic Claude API (claude-sonnet-4-5-20250929)
- **Email Lookup**: Hunter.io API
- **Gmail/Calendar**: Google OAuth (placeholder, needs Google Cloud setup)

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
│   ├── services/           # ai.js (Claude), hunter.js (Hunter.io)
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
- User-specific API keys (Hunter.io, Anthropic) stored encrypted in the database per user

## Recent Changes
- 2026-02-08: Initial project build from documentation specs
