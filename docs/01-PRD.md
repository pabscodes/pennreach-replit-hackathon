# PennReach — Product Requirements Document

**Version:** 1.0
**Authors:** Pablo Ordonez Bravo, Sam Lazarus
**Last Updated:** 2026-02-08
**Status:** Draft

---

## 1. Problem Statement

Wharton MBA students spend 3-5 hours per outreach batch doing the following manually:

1. Finding alumni who work at companies/industries they care about
2. Figuring out what that person actually does (reading their LinkedIn)
3. Finding their work email
4. Writing a personalized cold email that doesn't sound generic
5. Checking their own calendar for available times
6. Pasting availability into the email
7. Sending and tracking who they've reached out to

Sam built a Google Sheets + Apps Script toolkit that automates steps 3-6. But it's:
- Locked to Google Sheets as the UI (clunky for non-technical users)
- Hardcoded to Sam's background (not multi-user)
- Template-based emails (merge fields, not truly personalized)
- No pipeline tracking beyond spreadsheet dropdowns

**PennReach** is a web app that does all of this better, for any Wharton/Penn student.

---

## 2. Target Users

**Primary:** Wharton MBA students during recruiting season (Sep-Feb)
- 1,800 students per cohort, ~80% actively networking
- Not technical — comfortable with web apps but not code
- Time-starved, doing 5-20 cold outreach emails per week
- Willing to pay $10-15/month for something that saves them 3+ hours/week

**Secondary:** Penn undergrads, other grad students doing career networking

**Anti-users:** Spammers, mass emailers. The tool is designed for high-quality, low-volume outreach (5-20 contacts/week, not 500).

---

## 3. User Stories

### Onboarding (one-time setup)
| ID | Story | Priority |
|----|-------|----------|
| U1 | As a new user, I can sign up with my email and set a password | P0 |
| U2 | As a new user, I can fill in my background (school, prior experience, interests) so the AI knows who I am | P0 |
| U3 | As a new user, I can paste or upload my resume so the AI has my full background | P1 |
| U4 | As a new user, I can set my email signature (name, title, phone, email) | P0 |
| U5 | As a new user, I can enter my Hunter.io API key for email lookups | P0 |
| U6 | As a new user, I can connect my Gmail account so drafts are created directly in my inbox | P1 |
| U7 | As a new user, I can connect my Google Calendar so availability is auto-generated | P1 |

### Per-Contact Flow (core loop)
| ID | Story | Priority |
|----|-------|----------|
| C1 | As a user, I can upload a LinkedIn PDF and have the contact's info auto-extracted | P0 |
| C2 | As a user, I can paste text from a profile (LinkedIn, company bio, etc.) and have it parsed | P0 |
| C3 | As a user, I can upload a screenshot of a profile and have it parsed | P1 |
| C4 | As a user, I can see a contact card with extracted info (name, company, role, background summary, conversation hooks) | P0 |
| C5 | As a user, I can select why I'm reaching out (job interest, coffee chat, mentorship, industry info) and add specific context | P0 |
| C6 | As a user, I can click "Find Email" and have Hunter.io look up their work email | P0 |
| C7 | As a user, I can see an AI-drafted personalized email based on my background + their profile + my outreach goal | P0 |
| C8 | As a user, I can edit the draft in-app before sending | P0 |
| C9 | As a user, I can copy the final email to clipboard | P0 |
| C10 | As a user, I can click "Create Gmail Draft" and have it appear in my Gmail drafts folder | P1 |
| C11 | As a user, I can have my calendar availability auto-inserted into the email | P1 |

### Pipeline & Tracking
| ID | Story | Priority |
|----|-------|----------|
| T1 | As a user, I can see all my contacts in a pipeline view (kanban or table) organized by status | P1 |
| T2 | As a user, I can update a contact's status (new, emailed, followed up, responded, meeting scheduled) | P1 |
| T3 | As a user, I can see when I last emailed someone and how many days ago | P2 |
| T4 | As a user, I get a nudge when a contact hasn't responded in 5+ days | P2 |
| T5 | As a user, I can click "Draft Follow-up" and get an AI-generated follow-up email | P2 |

---

## 4. Priority Definitions

| Priority | Meaning | Rule |
|----------|---------|------|
| **P0** | Must have for hackathon demo | App is broken/useless without this. Build first. |
| **P1** | Should have — makes it a real product | Important for the "wow factor" but app works without it. Build second. |
| **P2** | Nice to have — polish and delight | Makes power users happy. Build if time permits. |

---

## 5. Feature Specs

### 5.1 Profile Upload & Parsing (P0)

**Input options:**
1. **LinkedIn PDF upload** — User clicks "Save to PDF" on LinkedIn, uploads the file
2. **Text paste** — User copies text from a bio, website, or LinkedIn and pastes it
3. **Screenshot upload** (P1) — User takes a screenshot and uploads it

**AI extraction output:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "company": "Goldman Sachs",
  "role": "Vice President, Technology Investment Banking",
  "linkedinUrl": "linkedin.com/in/janesmith",
  "background": "10 years in IB, started at Lazard, moved to GS. Penn undergrad '14. Covers fintech and enterprise software.",
  "conversationHooks": [
    "Also a Penn alum (undergrad '14)",
    "Covers fintech — your background in payments is relevant",
    "Based in NYC — easy to meet in person"
  ]
}
```

The `background` and `conversationHooks` fields are what make this better than Sam's approach. The AI doesn't just extract structured data — it reads the whole profile and identifies what makes this person interesting to reach out to.

**UI:** Upload area (drag & drop or click to browse) + paste textarea. After parsing, show a contact card with all extracted fields, editable.

### 5.2 Email Drafting (P0)

**Inputs to the AI:**
1. User's background (from onboarding)
2. User's email signature (from onboarding)
3. Contact's full profile (from parsing)
4. Outreach goal (dropdown: job interest, coffee chat, mentorship, industry info)
5. Specific context (freetext: "I'm interested in their fintech coverage")
6. Availability text (from Google Calendar or manual input)

**Output:** A complete, ready-to-send email with subject line.

**Quality bar:**
- Under 150 words (body only, excluding signature)
- Opens with a specific connection point, not generic
- One clear ask (15-min call)
- Availability included naturally
- Sounds human, not AI-generated
- No filler phrases ("I hope this finds you well", "I wanted to reach out")

**UI:** Full email preview with subject line at top. Editable textarea. "Regenerate" button for a new draft. "Copy to Clipboard" button. "Create Gmail Draft" button (P1).

### 5.3 Email Lookup — Hunter.io (P0)

**How it works:**
1. User enters their Hunter.io API key during onboarding (stored encrypted)
2. When user clicks "Find Email" on a contact, we call Hunter.io's API:
   - First: `domain-search` to find the company's email domain
   - Then: `email-finder` with first name + last name + domain
3. Display: email address + confidence score (Hunter provides this)

**Free tier limits:** 25 searches/month. Display remaining searches count.

**Fallback if Hunter fails:** Show a message with suggestions:
- "Try searching {firstName}{lastName}@{company}.com"
- "Check their LinkedIn profile for a personal email"
- Manual email input field

### 5.4 Gmail Integration (P1)

**OAuth scopes needed:**
- `gmail.compose` — create drafts (does NOT read their email)
- `calendar.readonly` — read calendar events (does NOT modify)

**Flow:**
1. User clicks "Connect Gmail" in settings
2. Google OAuth consent screen (we request ONLY compose + calendar.readonly)
3. We store the refresh token (encrypted)
4. When user clicks "Create Gmail Draft":
   - Exchange refresh token for access token
   - Call Gmail API `drafts.create` with the email content
   - Return the draft ID and a link to open it in Gmail

**Calendar availability generation** (same logic as Sam's script):
- Look ahead: tomorrow through two Fridays out
- Working hours: 10 AM - 5 PM EST (configurable in settings)
- 15-min buffers before and after meetings
- Minimum 1-hour free slot
- Skip weekends
- Ignore events with certain prefixes (user-configurable)
- Format: `Thu, Feb 5: 10:00 AM - 12:00 PM, 2:00 PM - 5:00 PM`

### 5.5 Pipeline Dashboard (P1)

**Contact statuses:**
```
New → Email Found → Draft Created → Sent → Followed Up → Responded → Meeting Scheduled
```

**Views:**
- **Table view** (default): Sortable/filterable table of all contacts
- **Kanban view** (P2): Drag contacts between status columns

**Table columns:**
| Name | Company | Role | Status | Email | Last Action | Days Since | Actions |
|------|---------|------|--------|-------|-------------|------------|---------|

**Actions per contact:**
- View profile card
- Find email
- Draft email
- Update status
- Delete

### 5.6 Onboarding (P0)

**Step 1 — Account:**
- Email + password
- (P2: @wharton.upenn.edu verification)

**Step 2 — Your Background:**
- Full name
- School + class year (dropdown: "Wharton MBA 2027", "Penn Engineering MS 2026", etc.)
- Prior experience (textarea: "4 years at Deloitte managing enterprise tech for gov clients")
- Current interests (textarea: "Fintech, payments, enterprise SaaS")
- Resume upload (P1, optional)

**Step 3 — Email Setup:**
- Email signature (textarea, pre-filled with a template they can edit)
- Hunter.io API key (with link to sign up for free)
- Anthropic API key (for AI features)

**Step 4 — Integrations (P1):**
- Connect Gmail (OAuth button)
- Connect Google Calendar (OAuth button, same consent screen)

---

## 6. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| **Response time** | Profile parsing < 5 seconds, email drafting < 3 seconds |
| **Uptime** | 99% (Replit deployment) |
| **Data security** | API keys encrypted at rest, OAuth tokens encrypted, no plaintext secrets in DB |
| **Privacy** | We don't store LinkedIn PDFs — only extracted text. Users can delete their account and all data. |
| **Scale** | 50-200 users, each with 50-200 contacts. ~10K total contacts max. Trivial for Postgres. |
| **Mobile** | Responsive design (works on phone), but desktop-first |

---

## 7. Out of Scope (for now)

- Alumni database search/sourcing (user brings their own contacts)
- Chrome extension for LinkedIn
- Automated sending (we create drafts, user reviews and sends)
- CRM-level analytics (open rates, response rates)
- Team features (shared contact pools)
- Slack/WhatsApp notifications
- LinkedIn messaging integration

---

## 8. Success Metrics

**Hackathon:**
- Working demo: upload → parse → draft → copy/send
- 3+ test users successfully send an outreach email through the app

**Post-hackathon:**
- 50+ Wharton students sign up in the first week
- Average user creates 5+ drafts per week
- Email response rate > 25% (track manually via status updates)

---

## 9. Competitive Landscape

| Tool | What it does | Why PennReach is different |
|------|-------------|--------------------------|
| Sam's Google Sheets toolkit | Template emails with merge fields | AI-native drafting, multi-user, web UI |
| LinkedIn Sales Navigator | Find alumni by filters | We draft the email, not just find the person |
| Apollo.io | B2B email enrichment | We're purpose-built for MBA networking, not sales |
| Lavender.ai | AI email writing | Generic — not tailored to cold outreach from students |
| Networking templates (blogs) | Copy-paste templates | Our emails are personalized per contact, not generic |

---

## 10. Open Questions

1. **Should we require @wharton.upenn.edu email to sign up?** Limits market but validates users.
2. **Should we subsidize AI costs or require users to bring their own Anthropic key?** Subsidizing is better UX but costs money.
3. **Freemium or fully free for launch?** Recommend free for first 2 weeks to build user base.
4. **Should "Create Gmail Draft" be the default action, or "Copy to Clipboard"?** OAuth adds friction to onboarding but is a better experience long-term.
