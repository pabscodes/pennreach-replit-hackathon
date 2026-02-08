# PennReach — Hackathon Gameplan

The step-by-step playbook for building this in a hackathon sprint.

---

## Timeline Overview

```
DAY 1 (6-8 hours)
├── Hour 0-1:    Setup (Replit, GitHub, Google Cloud, APIs)
├── Hour 1-3:    Replit Agent scaffolds the full app
├── Hour 3-5:    Fix scaffold issues, get auth + onboarding working
└── Hour 5-8:    Upload → Parse → Contact Card flow working

DAY 2 (6-8 hours)
├── Hour 0-3:    Email drafting flow end-to-end
├── Hour 3-4:    Hunter.io integration
├── Hour 4-7:    Gmail OAuth + Calendar availability
└── Hour 7-8:    Pipeline dashboard

DAY 3 (4-6 hours)
├── Hour 0-2:    Polish, fix bugs, edge cases
├── Hour 2-3:    Demo data, loading states, error messages
├── Hour 3-4:    Test everything end-to-end
└── Hour 4-5:    Prepare demo / presentation
```

---

## Pre-Hackathon Checklist (do before Day 1)

```
ACCOUNTS
[ ] Replit account created (both Pablo + Sam)
[ ] Replit Core plan activated ($25 credit)
[ ] GitHub account (both)
[ ] Hunter.io account → API key copied
[ ] Anthropic Console account → API key + billing set up
[ ] Google Cloud Console account

PREPARATION
[ ] Read through all 4 docs in this folder
[ ] Download 5 LinkedIn PDFs for testing (diverse: different companies, roles)
[ ] Write your own background paragraph (for onboarding)
[ ] Write your email signature
[ ] Agree on who does what (see Work Split below)

GOOGLE CLOUD (do this before the hackathon — it takes 15-30 min)
[ ] Create Google Cloud project "PennReach"
[ ] Enable Gmail API
[ ] Enable Google Calendar API
[ ] Configure OAuth consent screen (External, Testing mode)
[ ] Add both your emails as test users
[ ] Create OAuth 2.0 Client ID (Web application)
[ ] Note: You'll set the redirect URI after you have the Replit URL
```

---

## Work Split Recommendation

### Option A: Frontend / Backend Split (Recommended)

```
PABLO                              SAM
──────                             ────
Frontend Pages:                    Backend Services:
├── Login/Signup forms             ├── Auth routes (signup, login, JWT)
├── Onboarding multi-step form     ├── Prisma schema + migrations
├── Upload & Parse page            ├── Profile parsing (Claude API)
├── Contact card component         ├── Email drafting (Claude API)
├── Draft editor component         ├── Hunter.io integration
├── Pipeline dashboard table       ├── Gmail OAuth flow
├── Settings page                  ├── Calendar availability logic
└── Loading states, toasts         └── Error handling, validation
```

**How this works in practice:**
- Sam builds the API endpoints first. Tests them with curl or Postman.
- Pablo builds the UI pages. Initially uses mock data, then wires up to Sam's endpoints.
- They merge and connect frontend → backend.

### Option B: Feature-Based Split

```
PABLO                              SAM
──────                             ────
Feature: Upload + Parse            Feature: Drafting + Email
├── Upload form (frontend)         ├── Goal selector (frontend)
├── Parse endpoint (backend)       ├── Draft editor (frontend)
├── Contact card (frontend)        ├── Draft endpoint (backend)
├── Claude integration             ├── Hunter.io integration
└── Contact CRUD                   └── Gmail OAuth + Calendar

SHARED
├── Auth (whoever finishes first)
├── Pipeline dashboard (whoever has time)
└── Settings page (whoever has time)
```

---

## P0 / P1 / P2 Checklist

### P0 — Must ship (hackathon demo doesn't work without these)

```
AUTH & ONBOARDING
[ ] Sign up with email + password
[ ] Log in → redirect to dashboard
[ ] Onboarding: name, school, background, interests
[ ] Onboarding: email signature
[ ] Onboarding: API key inputs (Hunter + Anthropic)

PROFILE PARSING
[ ] Upload LinkedIn PDF → send to Claude → extract fields
[ ] Paste text → send to Claude → extract fields
[ ] Display contact card with name, company, role, summary, hooks
[ ] Edit any field on the contact card
[ ] Save contact to database

EMAIL DRAFTING
[ ] Select outreach goal (dropdown)
[ ] Add specific context (textarea)
[ ] "Generate Draft" → Claude creates personalized email
[ ] Edit draft in-app (subject + body)
[ ] "Copy to Clipboard" button
[ ] "Regenerate" button for new draft

EMAIL LOOKUP
[ ] "Find Email" button → calls Hunter.io
[ ] Display found email + confidence
[ ] Manual email input fallback
```

### P1 — Should ship (makes it a real product, impresses judges)

```
GMAIL + CALENDAR
[ ] "Connect Gmail" OAuth flow
[ ] "Create Gmail Draft" button → draft appears in Gmail
[ ] Calendar availability auto-generated
[ ] Availability inserted into email draft

PIPELINE
[ ] Dashboard table with all contacts
[ ] Status badges (color-coded)
[ ] Update status from dashboard
[ ] Contact detail page

POLISH
[ ] Loading spinners during AI calls
[ ] Error toasts (API key missing, parsing failed, etc.)
[ ] Empty states ("No contacts yet")
[ ] Remaining Hunter.io searches count
```

### P2 — Nice to have (if time permits)

```
[ ] Follow-up email drafting ("It's been X days...")
[ ] Screenshot upload (image → Claude vision)
[ ] Kanban board view (drag between columns)
[ ] Email template customization
[ ] "Days since last action" column
[ ] Contact search/filter
[ ] Export contacts to CSV
[ ] Dark mode
```

---

## Troubleshooting Playbook

### "Replit Agent generated broken code"

This will happen. Don't panic. Common issues:

1. **Import errors** — Replit Agent sometimes imports components that don't exist. Read the error, find the import, fix or remove it.
2. **Missing packages** — Run `npm install package-name` in the terminal.
3. **Prisma not synced** — Run `npx prisma db push` in the server directory.
4. **Environment variables missing** — Check Replit Secrets panel. Every variable in `.env.example` needs to be set.
5. **CORS errors** — The backend needs to allow requests from the frontend URL. Check the CORS config in `server/index.js`.

### "Claude API returns weird results"

1. Check the response in the backend logs
2. The model might be returning markdown-wrapped JSON. Parse it: `content.match(/\{[\s\S]*\}/)[0]`
3. If it's returning non-JSON, make the prompt more explicit: "Return ONLY valid JSON. No markdown. No explanation."
4. If profiles are being parsed incorrectly, add examples to the prompt

### "Hunter.io says 'not found' for everyone"

1. Check your API key is correct
2. Check you haven't exceeded 25/month limit
3. The company name might not match Hunter's database. Try the domain directly.
4. Some companies block Hunter — this is expected. Fallback to manual entry.

### "Gmail OAuth isn't working"

1. **Redirect URI mismatch** — The URI in Google Cloud Console must EXACTLY match your Replit URL + `/api/gmail/callback`
2. **Not a test user** — In Testing mode, only emails listed as test users can authenticate
3. **Scopes not enabled** — Make sure `gmail.compose` and `calendar.events.readonly` are in the consent screen
4. **Token expired** — Refresh tokens should be long-lived but access tokens expire hourly. Make sure the refresh logic works.

### "Merge conflict in Git"

1. Don't panic. Git will mark the conflicting sections:
```
<<<<<<< HEAD
your version of the code
=======
their version of the code
>>>>>>> branch-name
```
2. Pick which version to keep (or combine them)
3. Remove the `<<<<<<<`, `=======`, `>>>>>>>` markers
4. Save, commit, push

---

## Demo Script (3-5 minutes)

### Slide 1: The Problem (30 sec)
"Every Wharton student spends hours each week writing cold outreach emails. You research the person, find their email, write a personalized email, check your calendar, and track everything in a spreadsheet. It's tedious and the emails end up sounding generic."

### Live Demo (3 min)
1. Show the dashboard (empty state or with a few contacts)
2. Click "New Contact"
3. Upload a real LinkedIn PDF — watch it parse in real-time
4. Show the contact card with summary and hooks
5. Select "Coffee Chat" goal, add context: "Interested in their fintech coverage"
6. Click "Generate Draft" — show the personalized email
7. Point out how it references the contact's actual background
8. Click "Copy to Clipboard" (or "Create Gmail Draft" if Gmail is connected)
9. Flip to Gmail — show the draft sitting there, ready to send
10. Go back to dashboard — show the contact in the pipeline

### Slide 2: How It Works (30 sec)
"Upload any profile → AI understands who they are → drafts a personalized email → finds their work email → creates a Gmail draft. What used to take 20 minutes per person now takes 30 seconds."

### Q&A Prep
- **"How is this different from ChatGPT?"** → "ChatGPT doesn't know your background, doesn't find their email, doesn't check your calendar, doesn't create the Gmail draft. This is an end-to-end pipeline, not a chatbot."
- **"What about privacy?"** → "We don't store LinkedIn PDFs. We extract the text and discard the file. Users can delete their account and all data."
- **"What's the business model?"** → "Free for launch. $10/month for unlimited contacts once we have traction. Long-term: sell to career services departments as a white-label tool."
- **"Can this be used for spam?"** → "Designed for low-volume, high-quality outreach. We cap at 20 drafts/day. Every email is reviewed by the user before sending."

---

## After the Hackathon

If you want to keep building:

1. **Get 50 beta users** — Post in Wharton Slack/WhatsApp groups
2. **Track metrics** — How many drafts created? How many sent? Response rate?
3. **Add @wharton.upenn.edu verification** — Limits to Penn community
4. **Add Stripe** — $10/month after free trial
5. **Consider the alumni search component** — The original vision. Apollo.io API for finding alumni by industry/company, THEN feed them into the drafting pipeline.
6. **Apply to Penn's startup programs** — Wharton Venture Initiation Program, Penn Center for Innovation
