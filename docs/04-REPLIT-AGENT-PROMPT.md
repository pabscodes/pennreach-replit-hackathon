# Replit Agent Prompt

Copy-paste this ENTIRE prompt into Replit Agent to scaffold the app.
This is designed to get the maximum amount of working code in one shot.

---

## THE PROMPT (copy everything below this line)

Build a full-stack web app called "PennReach" — an alumni cold outreach tool for MBA students. The app helps users upload professional profiles (LinkedIn PDFs, text, screenshots), find work emails via Hunter.io, and generate AI-personalized outreach emails using Claude.

### Tech Stack
- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui components
- **Backend:** Node.js + Express
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** bcrypt for passwords, JWT stored in HttpOnly cookies

### Database Schema (use Prisma)

```prisma
model User {
  id              Int       @id @default(autoincrement())
  email           String    @unique
  passwordHash    String
  name            String?
  school          String?
  background      String?
  interests       String?
  resumeText      String?
  emailSignature  String?
  hunterApiKey    String?
  anthropicApiKey String?
  googleAccessToken  String?
  googleRefreshToken String?
  googleTokenExpiry  DateTime?
  workingHoursStart  Int     @default(10)
  workingHoursEnd    Int     @default(17)
  timezone           String  @default("America/New_York")
  onboardingComplete Boolean @default(false)
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
  profileSummary  String?
  rawProfileText  String?
  hooks           String?
  outreachGoal    String?
  goalDetail      String?
  status          String    @default("new")
  emailStatus     String    @default("not_searched")
  emailConfidence Int?
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
  gmailDraftId    String?
  version         Int       @default(1)
  createdAt       DateTime  @default(now())
}
```

### Pages (React Router)

1. **`/login`** — Email + password login form. Redirect to `/dashboard` on success.
2. **`/signup`** — Email + password signup form. Redirect to `/onboarding` on success.
3. **`/onboarding`** — Multi-step form (4 steps):
   - Step 1: Name, school (dropdown with options like "Wharton MBA 2027", "Wharton MBA 2026", "Penn Engineering MS 2027", etc.), background (textarea), interests (textarea)
   - Step 2: Email signature (textarea, pre-filled with template: "Best,\n{name}\n{school}\nUniversity of Pennsylvania")
   - Step 3: API keys — Hunter.io API key (text input with link to hunter.io), Anthropic API key (text input with link to console.anthropic.com). Both optional with "Skip" button.
   - Step 4: "You're all set!" summary. Button to go to dashboard.
4. **`/dashboard`** — Pipeline view. Table of all contacts with columns: Name, Company, Role, Status (colored badge), Email Status, Last Action, Days Since, Actions (view/delete). Sorted by most recent first. "New Contact" button at top.
5. **`/contacts/new`** — The core flow page with these sections:
   - **Upload section:** Drag-and-drop area for PDF/image files + textarea for pasting text. "Parse Profile" button.
   - **Contact card section:** (appears after parsing) Shows extracted fields — firstName, lastName, company, role, linkedinUrl, profileSummary, hooks (as tags). All fields editable. "Find Email" button.
   - **Goal section:** (below contact card) Dropdown for outreach goal (Job Interest, Coffee Chat, Mentorship, Industry Info). Textarea for specific context. Textarea for manual availability (placeholder: "e.g., Tue 2-4 PM, Thu 10-12 PM EST").
   - **Draft section:** "Generate Draft" button. When draft appears: subject line (editable input), body (editable textarea), action buttons: "Regenerate", "Copy to Clipboard", "Save Contact". Copy to Clipboard should copy subject + body.
6. **`/contacts/:id`** — Contact detail page. Shows contact card + all draft versions + status update dropdown.
7. **`/settings`** — Update profile, background, API keys. Connect Gmail button (placeholder for now). Calendar settings (working hours, timezone).

### Backend API Routes

```
POST   /api/auth/signup         { email, password }
POST   /api/auth/login          { email, password }
GET    /api/auth/me             Get current user (from JWT cookie)
POST   /api/auth/logout         Clear cookie

PUT    /api/user/profile        { name, school, background, interests, emailSignature }
PUT    /api/user/settings       { hunterApiKey, anthropicApiKey }
PUT    /api/user/onboarding     { onboardingComplete: true }

POST   /api/contacts/parse      multipart/form-data { file } OR { text }
GET    /api/contacts            List all contacts for current user
GET    /api/contacts/:id        Get one contact with drafts
PUT    /api/contacts/:id        Update contact fields
DELETE /api/contacts/:id        Delete contact
PUT    /api/contacts/:id/status { status }

POST   /api/contacts/:id/find-email   Call Hunter.io
POST   /api/contacts/:id/draft        { outreachGoal, goalDetail, availability }

GET    /api/gmail/auth-url      Returns Google OAuth URL
GET    /api/gmail/callback      OAuth callback, stores tokens
POST   /api/gmail/create-draft  { draftId, to }
GET    /api/calendar/availability  Returns free slots text
```

### Profile Parsing Logic (server/services/ai.js)

When a file or text is received at `/api/contacts/parse`:

1. If it's a PDF file: send to Anthropic API as a base64-encoded document
2. If it's an image: send as a base64-encoded image
3. If it's text: send as text content

Use this Claude API prompt:
```
You are an expert at analyzing professional profiles. Extract information and return ONLY valid JSON:

{
  "firstName": "",
  "lastName": "",
  "company": "current company",
  "role": "current title",
  "linkedinUrl": "if visible in the profile",
  "profileSummary": "2-3 sentence summary of their career trajectory and what makes them interesting to network with",
  "hooks": ["3-5 specific conversation hooks based on their background"]
}
```

Use model `claude-sonnet-4-5-20250929` with max_tokens 800.

### Email Drafting Logic

When `/api/contacts/:id/draft` is called:

1. Fetch the user's profile (background, school, interests, signature)
2. Fetch the contact (profileSummary, hooks, company, role)
3. Call Claude with this prompt:

```
You are writing a cold outreach email for an MBA student.

SENDER: {user.name}, {user.school}. Background: {user.background}. Interests: {user.interests}.

RECIPIENT: {contact.firstName} {contact.lastName}, {contact.role} at {contact.company}.
Background: {contact.profileSummary}
Hooks: {contact.hooks}

GOAL: {outreachGoal}
CONTEXT: {goalDetail}
AVAILABILITY: {availability or "not provided"}

Write a cold email. Rules:
- Subject line: short, specific, mentions their company
- Under 150 words body
- Open with something specific about THEM
- Connect sender's background to recipient's world
- Clear ask: 15-minute call
- Include availability if provided
- End with sender's signature: {user.emailSignature}
- No "I hope this finds you well" or filler phrases

Return JSON: { "subject": "...", "body": "..." }
```

### Hunter.io Logic

When `/api/contacts/:id/find-email` is called:

1. Get the user's Hunter.io API key from DB
2. Call `https://api.hunter.io/v2/domain-search?company={company}&api_key={key}`
3. If domain found, call `https://api.hunter.io/v2/email-finder?domain={domain}&first_name={firstName}&last_name={lastName}&api_key={key}`
4. Return email + confidence score
5. Update contact's workEmail, emailStatus, emailConfidence

### Important Implementation Details

- **Auth middleware:** Every route except `/api/auth/*` should require a valid JWT cookie. Create a middleware that verifies the JWT and adds `req.userId` to the request.
- **File uploads:** Use `multer` with memory storage (no disk). Accept PDF (application/pdf) and images (image/png, image/jpeg). Max 10MB.
- **Error handling:** Every route should have try/catch. Return `{ error: "message" }` with appropriate status codes.
- **CORS:** Configure for the frontend origin.
- **API keys in DB:** For now, store as plain text (we'll add encryption later). NEVER log or return API keys in responses.
- **Cookie settings:** HttpOnly, SameSite: 'lax', Secure: true in production.
- **Prisma:** Run `npx prisma db push` to sync schema with database.

### UI Style Guide

- Use shadcn/ui components: Button, Card, Input, Textarea, Select, Badge, Table, Dialog, Toast
- Color scheme: Blue primary (#4a86e8), slate gray backgrounds
- Status badge colors: new=gray, email_found=blue, draft_created=yellow, sent=purple, followed_up=orange, responded=green, meeting_scheduled=emerald
- Loading states: Show a spinner component while waiting for AI responses
- Toast notifications for success/error messages
- Responsive: Works on desktop (primary) and mobile (secondary)

### Folder Structure
```
pennreach/
├── client/
│   ├── src/
│   │   ├── components/ (reusable UI components)
│   │   ├── pages/ (Login, Signup, Onboarding, Dashboard, NewContact, ContactDetail, Settings)
│   │   ├── hooks/ (useAuth, useContacts)
│   │   ├── lib/api.js (fetch wrapper)
│   │   ├── App.jsx (router setup)
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── server/
│   ├── routes/ (auth, user, contacts, drafts, gmail, calendar)
│   ├── services/ (ai.js, hunter.js, google.js)
│   ├── middleware/ (auth.js, upload.js)
│   ├── prisma/schema.prisma
│   ├── index.js
│   └── package.json
└── package.json (root, with scripts to run both)
```

Please build this complete application. Focus on getting every page functional with real API calls. Use placeholder/mock data where external APIs aren't configured yet (show helpful messages like "Enter your Hunter.io API key in Settings to enable email lookup").
