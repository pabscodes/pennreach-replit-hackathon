# PennReach — Development Guide

A guide for Pablo and Sam — two non-engineers building their first web app together.

---

## 1. How This Project Is Organized

Think of the project as two separate apps that talk to each other:

```
┌────────────┐         ┌────────────┐         ┌────────────┐
│  FRONTEND  │  ←───→  │  BACKEND   │  ←───→  │  DATABASE  │
│  (React)   │  HTTP   │  (Express) │   SQL   │ (Postgres) │
│            │ requests│            │ queries │            │
│ What users │         │ Business   │         │ Where data │
│ see & click│         │ logic, API │         │ is stored  │
│            │         │ calls      │         │            │
└────────────┘         └────────────┘         └────────────┘
```

- **Frontend (client/)** = The website. Buttons, forms, pages. Written in React.
- **Backend (server/)** = The brain. Handles requests, talks to AI, calls Hunter.io, manages Gmail. Written in Node.js/Express.
- **Database (PostgreSQL)** = The memory. Stores users, contacts, drafts. Managed by Prisma ORM.

When a user clicks "Parse Profile," here's what happens:
1. Frontend sends the file to the backend (`POST /api/contacts/parse`)
2. Backend receives the file, sends it to Claude API, gets structured data back
3. Backend saves the data to the database
4. Backend sends the result back to the frontend
5. Frontend displays the contact card

---

## 2. Git & GitHub Basics

### What is Git?
Git tracks every change you make to your code. Think of it as "infinite undo" with descriptions. Every time you save a meaningful change, you create a **commit** — a snapshot with a message like "added profile parsing page."

### What is GitHub?
GitHub is where your Git repository lives online. It's the shared copy that both of you can access.

### Initial Setup (do once)

```bash
# In Replit's Shell tab, or your local terminal:
git config user.name "Pablo Ordonez Bravo"
git config user.email "your-email@wharton.upenn.edu"
```

### Daily Workflow

```bash
# 1. Before starting work, pull the latest changes
git pull origin main

# 2. Create a branch for your feature
git checkout -b pablo/add-upload-form

# 3. Do your work (edit files, test, etc.)

# 4. See what you changed
git status
git diff

# 5. Stage your changes
git add client/src/pages/NewContact.jsx
git add server/routes/contacts.js

# 6. Commit with a descriptive message
git commit -m "Add profile upload form and parsing endpoint"

# 7. Push your branch to GitHub
git push origin pablo/add-upload-form

# 8. Go to GitHub → create a Pull Request (PR)
# 9. The other person reviews → approves → merges
# 10. After merge, switch back to main and pull
git checkout main
git pull origin main
```

### Branch Naming Convention
```
pablo/feature-name     # Pablo's branches
sam/feature-name       # Sam's branches

Examples:
pablo/onboarding-form
sam/hunter-integration
pablo/gmail-oauth
sam/pipeline-dashboard
```

### Commit Message Style
Start with a verb. Keep it under 72 characters.

```
Good:
  "Add profile upload form with drag-and-drop"
  "Fix Hunter.io API key encryption"
  "Connect Gmail OAuth flow"
  "Update email drafting prompt for shorter output"

Bad:
  "stuff"
  "updates"
  "fixed things"
  "WIP"
```

### What is a Pull Request (PR)?
A PR is how you ask the other person to review your changes before they go into the main codebase. It's a conversation:

1. You push your branch
2. You create a PR on GitHub with a title + description
3. The other person reads the changes, leaves comments
4. You discuss, make fixes if needed
5. They approve → you merge → changes go into `main`

**Why bother?** It prevents both of you from accidentally breaking each other's work. Two sets of eyes catch bugs.

---

## 3. How to Split Work

### Who Builds What

The cleanest split is **frontend vs. backend**, so you're not editing the same files:

| Phase | Pablo | Sam |
|-------|-------|-----|
| **V0: Scaffold** | Both: Use Replit Agent together to generate the initial app | |
| **V1: Core** | Frontend: Onboarding flow, upload form, contact card UI | Backend: Profile parsing endpoint, Claude integration, database setup |
| **V2: Drafting** | Frontend: Draft editor, goal selector, regenerate button | Backend: Email drafting endpoint, Hunter.io integration |
| **V3: Gmail** | Frontend: Settings page, OAuth connect button, status indicators | Backend: Google OAuth flow, Gmail draft creation, Calendar availability |
| **V4: Pipeline** | Frontend: Pipeline table/dashboard, status badges | Backend: Contact CRUD endpoints, status update logic |

Alternatively, split by **feature vertically** (one person does frontend + backend for a feature). This is harder to coordinate but each person owns a complete feature.

### Avoiding Conflicts

1. **Don't both edit the same file at the same time.** If you're both working on the same page, one person should wait or work on a different part.
2. **Communicate before starting work.** Quick message: "I'm working on the upload form today."
3. **Pull before you push.** Always `git pull origin main` before starting work.
4. **Small, frequent PRs.** Don't work for 3 days and submit a massive PR. Do 1-2 PRs per day.

---

## 4. Development Phases

### Phase 0: Scaffold (Day 1, 2-3 hours)

**Goal:** Get a running app with all the pages and routing, even if they're empty.

**How:** Use Replit Agent with the prompt in `04-REPLIT-AGENT-PROMPT.md`. This should generate:
- React app with all pages (login, signup, onboarding, dashboard, new contact, settings)
- Express server with all routes stubbed
- Prisma schema + database migration
- Basic auth (signup, login, JWT)
- Tailwind + shadcn/ui configured

**Done when:** You can sign up, log in, and navigate between pages (even if they're empty).

**Test it:** Create an account, log in, see the dashboard. If this works, Phase 0 is done.

### Phase 1: Profile Upload + Parsing (Day 1-2, 3-4 hours)

**Goal:** Upload a LinkedIn PDF → see a parsed contact card.

**Tasks:**
- [ ] Build the upload form (drag & drop + paste textarea)
- [ ] Build the backend `/api/contacts/parse` endpoint
- [ ] Wire up Claude API call with the parsing prompt
- [ ] Display the contact card with extracted info
- [ ] Make fields editable (user can correct any mistakes)
- [ ] Save to database

**Test it:** Upload Sam's LinkedIn PDF. Does it correctly extract name, company, role? Does it generate a useful summary and hooks? Try 3-5 different profiles.

### Phase 2: Email Drafting (Day 2, 3-4 hours)

**Goal:** Select outreach goal → get a personalized draft → edit → copy.

**Tasks:**
- [ ] Build the goal selector (dropdown + freetext)
- [ ] Build the backend `/api/contacts/:id/draft` endpoint
- [ ] Wire up Claude API call with the drafting prompt
- [ ] Build the draft editor (editable textarea with preview)
- [ ] "Regenerate" button for a new draft
- [ ] "Copy to Clipboard" button
- [ ] Manual availability input (textarea for now)

**Test it:** Parse a contact, select "coffee chat," add context, generate draft. Is the email good? Is it under 150 words? Does it reference the contact's actual background? Try regenerating — do you get meaningfully different drafts?

### Phase 3: Hunter.io Email Lookup (Day 2, 1-2 hours)

**Goal:** Find work email with one click.

**Tasks:**
- [ ] Add Hunter.io API key input to settings/onboarding
- [ ] Build the backend `/api/contacts/:id/find-email` endpoint
- [ ] "Find Email" button on contact card
- [ ] Display email + confidence score
- [ ] Fallback message when not found
- [ ] Manual email input field

**Test it:** Look up a real person at a real company. Does Hunter find the email? What's the confidence score? Try a few that will fail (small companies, uncommon names).

### Phase 4: Gmail + Calendar Integration (Day 2-3, 3-4 hours)

**Goal:** One-click Gmail draft creation + auto availability.

**Tasks:**
- [ ] Set up Google Cloud project + OAuth consent screen
- [ ] Build the OAuth flow (auth URL → callback → token storage)
- [ ] Build the `/api/gmail/create-draft` endpoint
- [ ] "Create Gmail Draft" button in the draft editor
- [ ] Build the `/api/calendar/availability` endpoint
- [ ] Port Sam's availability logic (buffers, working hours, etc.)
- [ ] Auto-insert availability into drafts when calendar is connected

**Test it:** Connect your Gmail. Create a draft. Does it appear in your Gmail drafts folder? Connect your calendar. Does availability look correct compared to your actual schedule?

### Phase 5: Pipeline Dashboard (Day 3, 2-3 hours)

**Goal:** See all contacts in a table, track status.

**Tasks:**
- [ ] Build the pipeline table component
- [ ] Status badges with colors
- [ ] Click contact → see detail page with full history
- [ ] Status update dropdown
- [ ] Sort by status, date, company
- [ ] Contact count per status

**Test it:** Add 5-10 contacts. Move them through statuses. Does the dashboard reflect the changes? Can you find a specific contact quickly?

### Phase 6: Polish (Day 3, 2-3 hours)

**Goal:** Make it demo-ready.

**Tasks:**
- [ ] Loading states (spinners while AI is processing)
- [ ] Error handling (what happens when Hunter.io is down? When Claude fails?)
- [ ] Empty states ("No contacts yet — upload your first profile!")
- [ ] Mobile responsiveness (test on phone)
- [ ] Demo data: pre-populate with 3-5 example contacts for the demo

---

## 5. Testing Strategy

You don't need automated tests for a hackathon. But you DO need to test manually and systematically.

### The Test Checklist

Run through this before every demo or after every major change:

```
ACCOUNT
[ ] Can sign up with new email
[ ] Can log in with existing account
[ ] Can update profile/background in settings

UPLOAD & PARSE
[ ] Upload LinkedIn PDF → correct data extracted
[ ] Paste profile text → correct data extracted
[ ] Upload screenshot → correct data extracted (P1)
[ ] Can edit extracted fields
[ ] Contact saved to database

EMAIL LOOKUP
[ ] Hunter.io finds email for common company (Google, Goldman, etc.)
[ ] Graceful failure for unknown company
[ ] Confidence score displayed
[ ] Can manually enter email

DRAFTING
[ ] Draft generated with correct user background
[ ] Draft references contact's actual profile
[ ] Draft < 150 words
[ ] Different outreach goals produce different emails
[ ] "Regenerate" produces a new draft
[ ] "Copy to Clipboard" works

GMAIL (P1)
[ ] OAuth connect flow works
[ ] Draft appears in Gmail
[ ] Availability auto-inserted from calendar

PIPELINE
[ ] All contacts visible in table
[ ] Status updates work
[ ] Can click through to contact detail
```

### Common Bugs to Watch For

1. **PDF parsing fails silently** — Always check the Claude API response for errors
2. **Availability is empty** — Calendar might not have events in the date range, or timezone is wrong
3. **Hunter.io returns `null`** — The company name in the profile might not match Hunter's database (e.g., "GS" vs "Goldman Sachs")
4. **Gmail draft creation fails** — OAuth token probably expired, need to refresh
5. **Email draft is too long** — Claude sometimes ignores the word limit, add validation
6. **Special characters in names** — Names with accents, hyphens, apostrophes breaking things

---

## 6. Debugging Tips

### "Something isn't working" — How to Figure Out What

1. **Check the browser console** (F12 → Console tab). Red errors = something broke in the frontend.
2. **Check the Replit console** (the terminal where your server runs). Errors here = something broke in the backend.
3. **Check the Network tab** (F12 → Network). Look at the API request:
   - Is it being sent? (If not, the frontend button isn't wired up)
   - What's the response status? (200 = OK, 400 = bad request, 401 = not logged in, 500 = server error)
   - What's in the response body? (Usually has an error message)
4. **Add `console.log()`** statements in the backend code to see what values are at each step.

### "The AI draft is bad" — How to Fix It

The #1 lever is the prompt. If drafts are:
- **Too long:** Add "MAXIMUM 120 words" and "Count the words before returning."
- **Too generic:** Add more specific examples of good vs bad emails
- **Wrong tone:** Add "Write like a confident peer, not a desperate student"
- **Missing hooks:** Make sure the parsing step actually extracted good hooks

### "Claude API returns an error"

Common causes:
- API key is wrong or expired → re-enter in settings
- Rate limit hit → wait 60 seconds and try again
- Request too large → PDF might be too big, try text paste instead
- Model name wrong → make sure it's `claude-sonnet-4-5-20250929`

---

## 7. Environment Setup

### Replit Setup (Primary — where you develop and deploy)

1. Create a Replit account
2. Create a new project → "Node.js" template
3. Use Replit Agent to scaffold the app (paste the prompt from `04-REPLIT-AGENT-PROMPT.md`)
4. Set environment variables in Replit Secrets panel:
   - `DATABASE_URL` (Replit provides this when you enable PostgreSQL)
   - `JWT_SECRET` (generate a random string)
   - `ENCRYPTION_KEY` (generate a random 32-character string)
   - `GOOGLE_CLIENT_ID` (from Google Cloud Console)
   - `GOOGLE_CLIENT_SECRET` (from Google Cloud Console)
   - `GOOGLE_REDIRECT_URI` (your Replit app URL + `/api/gmail/callback`)

### Google Cloud Console Setup (for Gmail + Calendar)

1. Go to `console.cloud.google.com`
2. Create a new project called "PennReach"
3. Enable APIs: Gmail API, Google Calendar API
4. Configure OAuth consent screen:
   - User type: External
   - App name: PennReach
   - Add scopes: `gmail.compose`, `calendar.events.readonly`
   - Add your emails as test users
5. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URI: `https://your-app.replit.app/api/gmail/callback`
6. Copy the Client ID and Client Secret → Replit Secrets

### Hunter.io Setup

1. Go to `hunter.io` → sign up (free)
2. Go to API Keys → copy your key
3. Enter it in the PennReach settings page
4. Free tier: 25 email searches/month

### Anthropic API Setup

1. Go to `console.anthropic.com` → sign up
2. Create an API key
3. Add billing (pay-as-you-go, ~$0.50 for 100 contacts)
4. Enter the key in PennReach settings page

---

## 8. Glossary

| Term | What it means |
|------|--------------|
| **API** | Application Programming Interface — how two programs talk to each other. When our frontend calls `/api/contacts/parse`, that's an API call. |
| **Endpoint** | A specific URL on the backend that does something. Like `/api/contacts/parse` is an endpoint. |
| **Route** | Same as endpoint, from the backend's perspective. |
| **JWT** | JSON Web Token — a secure token that proves you're logged in. Stored as a cookie. |
| **OAuth** | A standard for "Sign in with Google." Lets our app access Gmail/Calendar without storing the user's Google password. |
| **ORM** | Object-Relational Mapping — Prisma translates JavaScript objects to SQL queries so you don't write raw SQL. |
| **Migration** | A script that changes the database structure (add a column, create a table). Prisma generates these. |
| **PR (Pull Request)** | A request to merge your branch's changes into the main codebase. The other person reviews it. |
| **Branch** | A parallel version of the code. You make changes on your branch without affecting `main` until you merge. |
| **Merge** | Combining your branch's changes into `main`. |
| **Merge conflict** | When both people edited the same line of code. Git can't decide which version to keep, so you manually choose. |
| **Deploy** | Making your app live on the internet. Replit does this automatically. |
| **Environment variable** | A secret value (API key, password) stored outside the code. Never hardcode secrets. |
| **CORS** | Cross-Origin Resource Sharing — a browser security rule. Our frontend (port 5173) needs permission to call our backend (port 3001). |
