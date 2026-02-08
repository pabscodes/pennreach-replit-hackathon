# PennReach — Technical Architecture

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                   │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Onboard  │  │ Upload & │  │  Draft   │  │  Pipeline  │  │
│  │  Flow    │  │  Parse   │  │  Editor  │  │  Dashboard │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
│                                                             │
│  UI Library: shadcn/ui (Tailwind-based components)          │
│  State: React hooks + context (no Redux needed at this size)│
│  HTTP: fetch() to backend API                               │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP (JSON)
┌───────────────────────────▼─────────────────────────────────┐
│                  BACKEND (Node.js + Express)                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Routes                                               │    │
│  │                                                     │    │
│  │  POST /api/auth/signup          Sign up             │    │
│  │  POST /api/auth/login           Log in              │    │
│  │  GET  /api/auth/me              Get current user    │    │
│  │                                                     │    │
│  │  PUT  /api/user/profile         Update background   │    │
│  │  PUT  /api/user/settings        Update API keys     │    │
│  │                                                     │    │
│  │  POST /api/contacts/parse       Upload + AI parse   │    │
│  │  GET  /api/contacts             List all contacts   │    │
│  │  GET  /api/contacts/:id         Get one contact     │    │
│  │  PUT  /api/contacts/:id         Update contact      │    │
│  │  DELETE /api/contacts/:id       Delete contact      │    │
│  │                                                     │    │
│  │  POST /api/contacts/:id/find-email  Hunter.io       │    │
│  │  POST /api/contacts/:id/draft   Generate AI draft   │    │
│  │  PUT  /api/drafts/:id           Update draft text   │    │
│  │                                                     │    │
│  │  GET  /api/gmail/auth-url       Get OAuth URL       │    │
│  │  GET  /api/gmail/callback       OAuth callback      │    │
│  │  POST /api/gmail/create-draft   Create Gmail draft  │    │
│  │  GET  /api/calendar/availability  Get free slots    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Middleware: auth (JWT), error handling, rate limiting       │
│  File uploads: multer (in-memory, no disk storage)          │
└───────────────────────────┬─────────────────────────────────┘
                            │ SQL
┌───────────────────────────▼─────────────────────────────────┐
│                  DATABASE (PostgreSQL)                        │
│                                                             │
│  users        User accounts + onboarding data + API keys    │
│  contacts     Contact pipeline (per user)                   │
│  email_drafts Draft versions (per contact)                  │
└─────────────────────────────────────────────────────────────┘

External APIs:
  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐
  │ Anthropic   │  │ Hunter.io   │  │ Google (Gmail + Cal) │
  │ Claude API  │  │ Email API   │  │ OAuth2 + REST API    │
  └─────────────┘  └─────────────┘  └──────────────────────┘
```

---

## 2. Tech Stack Decisions

| Layer | Choice | Why |
|-------|--------|-----|
| **Frontend** | React + Vite | Replit Agent generates React well. Vite is fast. |
| **UI components** | shadcn/ui + Tailwind CSS | Professional look with minimal effort. Copy-paste components. |
| **Backend** | Node.js + Express | Simple, Replit-native, easy for non-engineers to read. |
| **Database** | PostgreSQL (Replit built-in) | Free on Replit. Relational fits our data model perfectly. |
| **ORM** | Prisma | Type-safe, auto-generates SQL, great error messages. Migration management. |
| **Auth** | bcrypt + JWT | Simple. No third-party auth service needed. |
| **File upload** | multer (memory storage) | PDFs processed in memory → sent to Claude → text stored. No file storage needed. |
| **AI** | Anthropic Claude API (claude-sonnet-4-5-20250929) | Best for text understanding and generation. Sonnet is fast + cheap. |
| **Email lookup** | Hunter.io REST API | Industry standard. Free tier = 25/month. |
| **Gmail** | Google Gmail API v1 | Official API for creating drafts. |
| **Calendar** | Google Calendar API v3 | Official API for reading events. |
| **Encryption** | Node.js crypto (AES-256) | For API keys stored in the database. |

---

## 3. Database Schema (Prisma)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id              Int       @id @default(autoincrement())
  email           String    @unique
  passwordHash    String
  name            String?
  school          String?   // "Wharton MBA 2027"
  background      String?   // Free text about prior experience
  interests       String?   // Free text about current interests
  resumeText      String?   // Extracted text from uploaded resume
  emailSignature  String?   // Their sign-off block

  // API keys (encrypted)
  hunterApiKey    String?
  anthropicApiKey String?

  // Google OAuth (encrypted)
  googleAccessToken  String?
  googleRefreshToken String?
  googleTokenExpiry  DateTime?

  // Calendar settings
  workingHoursStart  Int     @default(10)  // 10 AM
  workingHoursEnd    Int     @default(17)  // 5 PM
  timezone           String  @default("America/New_York")

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  contacts        Contact[]
}

model Contact {
  id              Int       @id @default(autoincrement())
  userId          Int
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  firstName       String?
  lastName        String?
  company         String?
  role            String?
  linkedinUrl     String?
  workEmail       String?
  personalEmail   String?

  // AI-generated from profile parsing
  profileSummary  String?   // Deep background summary
  rawProfileText  String?   // Original text extracted from upload
  hooks           String?   // JSON array of conversation hooks

  // Outreach context
  outreachGoal    String?   // 'job', 'coffee_chat', 'mentorship', 'industry_info'
  goalDetail      String?   // Freetext context for why reaching out

  // Status tracking
  status          String    @default("new")
    // new → email_found → draft_created → sent → followed_up → responded → meeting_scheduled
  emailStatus     String    @default("not_searched")
    // not_searched → found → not_found
  emailConfidence Int?      // Hunter.io confidence score (0-100)

  lastActionAt    DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  drafts          EmailDraft[]
}

model EmailDraft {
  id              Int       @id @default(autoincrement())
  contactId       Int
  contact         Contact   @relation(fields: [contactId], references: [id], onDelete: Cascade)

  subject         String
  body            String
  availabilityText String?

  gmailDraftId    String?   // Gmail API draft ID (if created in Gmail)
  version         Int       @default(1)

  createdAt       DateTime  @default(now())
}
```

---

## 4. API Design Details

### 4.1 Profile Parsing Endpoint

```
POST /api/contacts/parse
Content-Type: multipart/form-data

Body:
  file: [PDF or image file]        // Optional
  text: "pasted profile text"      // Optional (use one or the other)

Response (200):
{
  "contact": {
    "id": 42,
    "firstName": "Jane",
    "lastName": "Smith",
    "company": "Goldman Sachs",
    "role": "VP, Technology Investment Banking",
    "linkedinUrl": "linkedin.com/in/janesmith",
    "profileSummary": "10 years in IB, started at Lazard...",
    "hooks": [
      "Also Penn alum (undergrad '14)",
      "Covers fintech — relevant to your payments background",
      "Based in NYC"
    ]
  }
}
```

**Backend logic:**
1. If file uploaded: convert to base64, send to Claude as `document` (PDF) or `image` (screenshot)
2. If text pasted: send to Claude as text
3. Claude extracts structured data + generates summary + identifies hooks
4. Save to `contacts` table
5. Return the created contact

### 4.2 Email Drafting Endpoint

```
POST /api/contacts/:id/draft
Content-Type: application/json

Body:
{
  "outreachGoal": "coffee_chat",
  "goalDetail": "Interested in their fintech coverage and path from Lazard to GS",
  "includeAvailability": true
}

Response (200):
{
  "draft": {
    "id": 7,
    "subject": "Penn Alum Interested in GS Tech Banking",
    "body": "Hi Jane,\n\nI came across your profile...",
    "availabilityText": "Thu, Feb 12: 10:00 AM - 12:00 PM...",
    "version": 1
  }
}
```

**Backend logic:**
1. Fetch user profile (background, signature, interests)
2. Fetch contact profile (summary, hooks, company, role)
3. If `includeAvailability` and Google Calendar connected: generate availability text
4. Call Claude with the drafting prompt (see section 6)
5. Save draft to `email_drafts` table
6. Return the draft

### 4.3 Hunter.io Email Lookup

```
POST /api/contacts/:id/find-email

Response (200):
{
  "email": "jane.smith@goldmansachs.com",
  "confidence": 92,
  "source": "hunter.io"
}

Response (200, not found):
{
  "email": null,
  "confidence": 0,
  "suggestions": [
    "Try: jsmith@goldmansachs.com",
    "Check their LinkedIn for a personal email"
  ]
}
```

### 4.4 Gmail Draft Creation

```
POST /api/gmail/create-draft
Content-Type: application/json

Body:
{
  "draftId": 7,         // Our internal draft ID
  "to": "jane.smith@goldmansachs.com"
}

Response (200):
{
  "gmailDraftId": "r-1234567890",
  "gmailUrl": "https://mail.google.com/mail/#drafts/r-1234567890"
}
```

---

## 5. Google OAuth Setup

### 5.1 Google Cloud Console Configuration

You need to create a Google Cloud project with these settings:

**OAuth Consent Screen:**
- App name: "PennReach"
- User support email: your email
- Scopes: `gmail.compose`, `calendar.readonly`
- Test users: add your own email (while in "Testing" mode)
- Publishing status: "Testing" (allows up to 100 test users without Google review)

**OAuth Client ID:**
- Application type: "Web application"
- Authorized redirect URIs: `https://your-replit-app.replit.app/api/gmail/callback`

**Credentials you'll get:**
- `GOOGLE_CLIENT_ID` = something like `123456-abc.apps.googleusercontent.com`
- `GOOGLE_CLIENT_SECRET` = `GOCSPX-xxxxxx`

### 5.2 OAuth Flow in the App

```
User clicks "Connect Gmail"
       │
       ▼
GET /api/gmail/auth-url
  → Returns Google OAuth URL with scopes: gmail.compose, calendar.readonly
       │
       ▼
User redirected to Google consent screen
  → User approves access
       │
       ▼
Google redirects to /api/gmail/callback?code=AUTH_CODE
  → Backend exchanges code for access_token + refresh_token
  → Stores encrypted tokens in users table
  → Redirects user back to settings page with success message
```

### 5.3 Token Refresh

Access tokens expire after 1 hour. Before any Gmail/Calendar API call:
1. Check if `googleTokenExpiry` < now
2. If expired, use refresh_token to get a new access_token
3. Update the stored access_token and expiry

---

## 6. AI Prompts

### 6.1 Profile Parsing Prompt

```
You are an expert at analyzing professional profiles. Extract information from
this profile and return a JSON object.

IMPORTANT: Also analyze the profile deeply to identify:
- Their career trajectory and key transitions
- What they might be passionate about based on their roles
- Any Penn/Wharton connection
- Conversation hooks (shared interests, mutual connections, notable achievements)

Return ONLY valid JSON in this exact format:
{
  "firstName": "",
  "lastName": "",
  "company": "current company",
  "role": "current title",
  "linkedinUrl": "if visible",
  "profileSummary": "2-3 sentence summary of their career and what makes them
                     interesting. Write it as if briefing someone before a
                     networking call.",
  "hooks": ["array", "of", "3-5 conversation hooks"]
}
```

### 6.2 Email Drafting Prompt

```
You are writing a cold outreach email for an MBA student reaching out to a
professional for networking.

=== ABOUT THE SENDER ===
Name: {user.name}
School: {user.school}
Background: {user.background}
Current interests: {user.interests}

=== ABOUT THE RECIPIENT ===
Name: {contact.firstName} {contact.lastName}
Role: {contact.role} at {contact.company}
Background: {contact.profileSummary}
Conversation hooks: {contact.hooks}

=== OUTREACH CONTEXT ===
Goal: {outreachGoal} (one of: job interest, coffee chat, mentorship, industry info)
Specific interest: {goalDetail}

=== AVAILABILITY ===
{availabilityText OR "Not provided — omit availability from the email"}

=== EMAIL SIGNATURE ===
{user.emailSignature}

=== INSTRUCTIONS ===
Write a cold outreach email. Follow these rules exactly:

1. Subject line: Short, specific, mentions their company or a shared connection.
   NOT generic like "Networking Request" or "Wharton Student Reaching Out."

2. Opening line: Reference something specific about THEM — their career path,
   a recent move, their company's work. Show you did your homework. Do NOT open
   with "I hope this finds you well" or any variant.

3. Body (2-3 short paragraphs max):
   - One sentence connecting your background to their world
   - One sentence on what specifically you want to learn
   - Clear ask: 15-minute phone call or coffee

4. If availability was provided, include it naturally (not as a data dump).
   Format: "I'm generally free [condensed version]. Would any of those work?"

5. Sign off with the provided signature.

6. Total email body: UNDER 150 words. Shorter is better. Busy people skim.

7. Tone: Warm, professional, confident but not arrogant. You're a peer asking
   for advice, not a supplicant begging for time.

Return JSON:
{
  "subject": "the subject line",
  "body": "the complete email body including signature"
}
```

### 6.3 Follow-up Email Prompt (P2)

```
Write a brief follow-up email. The original email was sent {daysSince} days ago
with no response.

Original email subject: {originalSubject}
Original email body: {originalBody}

Rules:
- Under 50 words
- Reference the original email
- Restate the ask briefly
- Don't guilt-trip or be passive-aggressive
- Tone: friendly, understanding that they're busy

Return JSON:
{
  "subject": "Re: {originalSubject}",
  "body": "the follow-up body"
}
```

---

## 7. File & Folder Structure

```
pennreach/
├── docs/                        # You are here
│   ├── 01-PRD.md
│   ├── 02-ARCHITECTURE.md
│   ├── 03-DEVELOPMENT-GUIDE.md
│   └── 04-REPLIT-AGENT-PROMPT.md
│
├── client/                      # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx       # Nav, sidebar
│   │   │   ├── Onboarding/
│   │   │   │   ├── Step1Account.jsx
│   │   │   │   ├── Step2Background.jsx
│   │   │   │   ├── Step3ApiKeys.jsx
│   │   │   │   └── Step4Integrations.jsx
│   │   │   ├── Contacts/
│   │   │   │   ├── UploadForm.jsx
│   │   │   │   ├── ContactCard.jsx
│   │   │   │   ├── ContactList.jsx
│   │   │   │   └── GoalSelector.jsx
│   │   │   ├── Drafts/
│   │   │   │   ├── DraftEditor.jsx
│   │   │   │   └── DraftPreview.jsx
│   │   │   └── Pipeline/
│   │   │       ├── PipelineTable.jsx
│   │   │       └── StatusBadge.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Onboarding.jsx
│   │   │   ├── Dashboard.jsx    # Pipeline view
│   │   │   ├── NewContact.jsx   # Upload + parse + draft flow
│   │   │   ├── ContactDetail.jsx
│   │   │   └── Settings.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── useContacts.js
│   │   ├── lib/
│   │   │   └── api.js           # Fetch wrapper for backend calls
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── server/                      # Express backend
│   ├── routes/
│   │   ├── auth.js
│   │   ├── user.js
│   │   ├── contacts.js
│   │   ├── drafts.js
│   │   ├── gmail.js
│   │   └── calendar.js
│   ├── services/
│   │   ├── ai.js               # Claude API calls (parse + draft)
│   │   ├── hunter.js           # Hunter.io API calls
│   │   ├── google.js           # Gmail + Calendar API calls
│   │   └── crypto.js           # Encrypt/decrypt API keys
│   ├── middleware/
│   │   ├── auth.js             # JWT verification
│   │   └── upload.js           # Multer config
│   ├── prisma/
│   │   └── schema.prisma
│   ├── index.js                # Express app entry point
│   └── package.json
│
├── .env                         # Environment variables (NEVER commit)
└── README.md
```

---

## 8. Environment Variables

```env
# Database
DATABASE_URL=postgresql://...    # Replit provides this automatically

# Auth
JWT_SECRET=random-string-here    # Generate with: openssl rand -hex 32
ENCRYPTION_KEY=random-32-bytes   # For encrypting API keys in DB

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REDIRECT_URI=https://your-app.replit.app/api/gmail/callback

# (User-provided, stored in DB, not here)
# HUNTER_API_KEY — per user
# ANTHROPIC_API_KEY — per user
```

---

## 9. Security Considerations

| Risk | Mitigation |
|------|-----------|
| API keys stored in DB | AES-256 encryption with `ENCRYPTION_KEY` env var |
| Google OAuth tokens in DB | Same encryption. Refresh tokens are long-lived — protect them. |
| JWT theft | HttpOnly cookies (not localStorage). Short expiry (24h). |
| SQL injection | Prisma ORM parameterizes all queries automatically |
| XSS | React auto-escapes output. No `dangerouslySetInnerHTML`. |
| CSRF | SameSite cookie policy + CORS restricted to our domain |
| Rate limiting | Express rate limiter on auth endpoints (5/min), API endpoints (30/min) |
| File upload attacks | Only accept PDF + image MIME types. Process in memory. Max 10MB. |

---

## 10. Deployment (Replit)

1. Create a new Replit project (Node.js template)
2. Enable PostgreSQL in the Replit database panel
3. Set environment variables in Replit Secrets
4. Backend runs on port 3001, frontend on port 5173 (Vite dev) or served statically in production
5. Replit auto-deploys on push

**Production build:**
```bash
# Build frontend
cd client && npm run build

# Serve built frontend from Express
# In server/index.js: app.use(express.static('../client/dist'))

# Start server
cd server && node index.js
```
