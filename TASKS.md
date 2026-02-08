# PennReach P0 Task Queue

## How to use this file
1. Work through issues in order (P0-1 first, then P0-2, etc.)
2. For each issue: read the spec, implement all checklist items, verify
3. Commit with message: "Fixes #N: [title]" — this auto-closes the GitHub issue
4. Move to the next issue
5. If an issue depends on another, skip it until the dependency is done

---

## Issue #2: P0-2: Onboarding — Name fields restructure

## Priority: P0 (Small, no dependencies)

## Context
Currently onboarding Step 1 has a single "Full Name" field. Need to split into proper fields and add preferred name option.

## Changes Required

### Database
- [ ] Add fields to User model: `firstName`, `lastName`, `preferredName` (nullable)
- [ ] Keep or deprecate existing `name` field (could compute from first+last)
- [ ] Run migration

### Client — `Onboarding.jsx` Step 1
- [ ] Replace single "Full Name" input with:
  - First Name (required)
  - Last Name (required)
  - Checkbox: "I go by a preferred name"
  - Preferred Name input (shown only when checkbox is checked)
- [ ] Update form state and validation
- [ ] Update API call to `PUT /api/user/profile`

### Server
- [ ] Update `PUT /api/user/profile` to accept `firstName`, `lastName`, `preferredName`
- [ ] Update `GET /api/auth/me` to return new fields
- [ ] Any place that uses `user.name` should use `preferredName || firstName`

### Client — Other pages
- [ ] Update `Layout.jsx` greeting to use preferred/first name
- [ ] Update `Settings.jsx` profile section with new fields
- [ ] Update email signature auto-population

## Validation
- [ ] Onboarding Step 1 saves first/last/preferred name correctly
- [ ] Preferred name checkbox toggles the field
- [ ] Display name used throughout app respects preferred name

**Commit message when done:** `Fixes #2: P0-2: Onboarding — Name fields restructure`

---

## Issue #3: P0-3: Onboarding — Resume upload, parser & auto-bio

## Priority: P0 (Medium-Large)
## Depends on: P0-1 (Replit AI), P0-2 (Name fields)

## Context
The current background/interests textareas are insufficient. We want users to upload their resume, have it parsed, and auto-generate a structured background description they can edit.

## Changes Required

### Client — `Onboarding.jsx` Step 1
- [ ] Add resume upload area (PDF drag & drop) at the top of Step 1
- [ ] On upload, call new parse endpoint
- [ ] Auto-fill from parsed resume:
  - First name, last name (into P0-2 fields)
  - Work experience (companies, roles, years)
  - Education
  - Skills/interests
- [ ] Replace "Background" and "Interests" textareas with structured fields:
  - Work experience section (parsed entries, editable)
  - Education section
  - Skills/interests tags
- [ ] Auto-generate editable bio paragraph:
  - Format: "[Name] is a [role/student] with [X] years of experience in [industries] at [companies]. [He/She/They] is seeking to spend [his/her/their] summer working on [interests] and is seeking experiences to gain [skills] for [his/her/their] passion in [field]."
  - User can edit this freely
- [ ] Show bio in an editable textarea below the parsed fields

### Server
- [ ] Create `POST /api/user/parse-resume` endpoint
  - Accept PDF upload (multipart)
  - Use AI to extract structured data: name, companies, roles, years, education, skills
  - Return structured JSON
- [ ] Create `POST /api/user/generate-bio` endpoint
  - Input: parsed resume data + user edits
  - Output: natural language bio paragraph
- [ ] Update `PUT /api/user/profile` to save `resumeText` and generated bio

### Database
- [ ] Add fields if needed: `generatedBio`, or use existing `background` for the bio

## Validation
- [ ] Upload PDF resume → fields auto-populate
- [ ] Bio auto-generates and is editable
- [ ] User can override any parsed field
- [ ] Skipping resume upload still allows manual entry

**Commit message when done:** `Fixes #3: P0-3: Onboarding — Resume upload, parser & auto-bio`

---

## Issue #4: P0-4: Onboarding — Outreach purpose questionnaire

## Priority: P0 (Small-Medium, no hard dependencies)

## Context
Need a "What kind of outreach do you want?" step in onboarding that asks about the purpose of outreach. This guides the AI context for draft generation later.

## Changes Required

### Client — `Onboarding.jsx`
- [ ] Add new step (after Background, before Email Signature) or integrate into Step 1 after bio
- [ ] Questionnaire options (multi-select or ranked):
  - Internship/job search
  - Coffee chats / informational interviews
  - Mentorship
  - Industry research / learning
  - Startup/project collaboration
  - Alumni networking
- [ ] For each selected purpose, optional context field: "Tell us more about what you're looking for"
- [ ] Update step navigation (total steps may increase from 4 to 5)

### Database
- [ ] Add field to User model: `outreachPurposes` (JSON array) and `outreachContext` (text)
- [ ] Run migration

### Server
- [ ] Update `PUT /api/user/profile` to accept new fields
- [ ] These fields will be used in draft generation prompt (P0-7)

## Validation
- [ ] User can select one or more outreach purposes
- [ ] Context is saved and retrievable
- [ ] Step navigation works with the new step count

**Commit message when done:** `Fixes #4: P0-4: Onboarding — Outreach purpose questionnaire`

---

## Issue #5: P0-5: Onboarding — Rich text email signature editor

## Priority: P0 (Small, independent)

## Context
Email signature step currently uses a plain textarea. Need a rich text / markdown editor supporting bold, italic, links, etc.

## Changes Required

### Client — `Onboarding.jsx` Step 2
- [ ] Replace plain textarea with a rich text / markdown editor
- [ ] Support: bold, italic, underline, links, line breaks
- [ ] Toolbar with formatting buttons
- [ ] Store as HTML or markdown string
- [ ] Preview of how signature will look in email

### Client — `Settings.jsx`
- [ ] Same rich text editor for email signature in Settings

### Options for editor library
- TipTap (lightweight, React-friendly)
- React Quill
- Simple markdown editor with preview

### Server
- [ ] `emailSignature` field already exists — may need to store as HTML instead of plain text
- [ ] Ensure draft generation injects signature correctly

## Validation
- [ ] Can bold, italicize, add links in signature
- [ ] Signature saves and loads correctly
- [ ] Signature renders properly in generated email drafts

**Commit message when done:** `Fixes #5: P0-5: Onboarding — Rich text email signature editor`

---

## Issue #6: P0-6: New Contact — Drag & drop + multi-file upload

## Priority: P0 (Small, independent)

## Context
The file upload area in New Contact needs drag & drop functionality and support for uploading multiple files at once (e.g., LinkedIn screenshot + company bio).

## Changes Required

### Client — `NewContact.jsx` Stage 1
- [ ] Add drag & drop zone with visual feedback (highlight on drag over)
- [ ] Support dropping multiple files
- [ ] Support clicking to select multiple files (multiple attribute on input)
- [ ] Show list of uploaded files with remove option
- [ ] File type indicators (PDF icon, image icon)
- [ ] Combine content from all uploaded files before sending to parse endpoint

### Server — `POST /api/contacts/parse`
- [ ] Accept multiple files in multipart form-data
- [ ] Parse each file and concatenate/merge the extracted text
- [ ] Send combined text to AI for single structured parse
- [ ] Update multer config in `server/middleware/upload.js` for multiple files

## Validation
- [ ] Drag & drop works with visual feedback
- [ ] Multiple files upload and parse together
- [ ] Can remove individual files before parsing
- [ ] Single file still works as before

**Commit message when done:** `Fixes #6: P0-6: New Contact — Drag & drop + multi-file upload`

---

## Issue #7: P0-7: New Contact — Kill hooks, add angle-based draft flow

## Priority: P0 (Medium-Large)
## Depends on: P0-1 (Replit AI), P0-4 (Outreach purposes for context)

## Context
Current flow: parse profile → show conversation hooks → user writes outreach goal → generate draft.

New flow: parse profile → AI generates 3 unique outreach angles based on JOINT interests between user and contact → user picks one → auto-draft based on that angle.

Kill "conversation hooks" entirely.

## Changes Required

### Database
- [ ] Remove `hooks` field from Contact model (or repurpose)
- [ ] Add `selectedAngle` (text) and `generatedAngles` (JSON) to Contact model
- [ ] Run migration

### Server — `POST /api/contacts/parse`
- [ ] Remove hooks extraction from AI parse prompt
- [ ] After parsing contact profile, generate 3 outreach angles:
  - Each angle = unique connection point between user background/interests AND the contact's profile
  - Format: { title: "Shared interest in X", description: "You both worked in fintech...", approach: "Lead with your experience at Y..." }
- [ ] Return angles alongside parsed contact data

### Server — `POST /api/contacts/:id/draft`
- [ ] Accept `selectedAngle` instead of generic `outreachGoal`/`goalDetail`
- [ ] Use the selected angle to drive the email draft prompt
- [ ] Draft should feel natural and specific to that angle

### Client — `NewContact.jsx`
- [ ] Remove all hooks UI (tags display, editing)
- [ ] After parse, show 3 angle cards:
  - Each card shows title + description + approach
  - User clicks to select one
  - Option to regenerate angles
- [ ] Selected angle flows directly into draft generation (skip outreach goal step)
- [ ] Simplified flow: Upload → Parse → Pick Angle → Review Draft → Save

### AI Prompt Updates
- [ ] Angle generation needs: user background, user outreach purposes (from P0-4), contact profile
- [ ] Draft prompt uses selected angle as primary context

## Validation
- [ ] No more "hooks" anywhere in the UI
- [ ] 3 angles generated are specific and compelling
- [ ] Selected angle produces a relevant, personalized draft
- [ ] Flow is simpler: fewer steps than before

**Commit message when done:** `Fixes #7: P0-7: New Contact — Kill hooks, add angle-based draft flow`

---

## Issue #8: P0-8: New Contact — Draft learning loop

## Priority: P0 (Medium)
## Depends on: P0-7 (Angle-based drafting)

## Context
After a user edits a draft, save their edits and use them to improve future drafts for similar types of contacts/industries/outreach purposes.

## Changes Required

### Database
- [ ] Add to EmailDraft model: `userEditedBody` (text), `userEditedSubject` (text)
- [ ] Add to Contact or EmailDraft: `industry` (string), `contactType` (string)
- [ ] Create new model `DraftFeedback`:
  - `userId`, `originalBody`, `editedBody`, `industry`, `outreachPurpose`, `angle`, `createdAt`
- [ ] Run migration

### Server
- [ ] When user saves edited draft (`PUT /api/drafts/:id`), compare original vs edited
- [ ] Store the diff/feedback in DraftFeedback table
- [ ] Update `POST /api/contacts/:id/draft` to:
  - Query recent DraftFeedback for similar industry/purpose
  - Include 1-2 examples of user's preferred style in the AI prompt
  - "The user previously edited drafts like this: [original → edited]. Match their preferred tone and style."

### Client — `NewContact.jsx`
- [ ] After draft is generated, user edits in-place
- [ ] On save, send both original and edited versions
- [ ] Show subtle indicator: "Your edits help improve future drafts"

## Validation
- [ ] First draft for new user works normally (no history)
- [ ] After 2-3 edited drafts, new drafts reflect user's style preferences
- [ ] Drafts for similar industries/purposes show improvement

**Commit message when done:** `Fixes #8: P0-8: New Contact — Draft learning loop`

---

## Issue #9: P0-9: Settings — API key management UX overhaul

## Priority: P0 (Small, independent)

## Context
When you add an API key, there is no indication it was saved, no option to delete it, and no way to update it. Need full CRUD UX for API keys.

## Changes Required

### Client — `Settings.jsx` API Keys section
- [ ] For each API key (Hunter.io, and any remaining):
  - **Empty state:** Input field + "Save" button
  - **Loaded state:** Show masked key (e.g., `sk-...a3f7`), green "Active" badge
  - **Actions:** "Update" button (reveals input), "Delete" button (with confirm)
- [ ] Success toast: "API key saved successfully" with green checkmark
- [ ] Error handling: "Invalid API key" if validation fails
- [ ] Delete confirmation modal: "Are you sure? This will disable [feature]."

### Server
- [ ] Add `DELETE /api/user/settings/hunter-key` endpoint
- [ ] Optional: validate key on save (ping Hunter.io to verify)
- [ ] `GET /api/auth/me` should return masked last 4 chars of saved keys

## Validation
- [ ] Save key → shows "Active" badge with masked key
- [ ] Delete key → confirms → removes → shows empty state
- [ ] Update key → reveals input → save → shows new masked key
- [ ] Error on invalid key

**Commit message when done:** `Fixes #9: P0-9: Settings — API key management UX overhaul`

---

## Issue #10: P0-10: Settings — Gmail & Google Calendar OAuth integration

## Priority: P0 (Large, independent but complex)

## Context
Gmail and Google Calendar integrations are currently placeholders. Need full OAuth flow, Gmail for sending/syncing drafts, and Calendar for finding free slots to suggest meeting times.

## Changes Required

### Google OAuth Setup
- [ ] Set up Google Cloud project with OAuth 2.0 credentials
- [ ] Required scopes: `gmail.send`, `gmail.compose`, `calendar.readonly`
- [ ] Create OAuth consent screen

### Server — Auth
- [ ] `GET /api/auth/google` — Initiate OAuth flow (redirect to Google)
- [ ] `GET /api/auth/google/callback` — Handle callback, store tokens
- [ ] Token refresh logic (access tokens expire hourly)
- [ ] Store `googleAccessToken`, `googleRefreshToken`, `googleTokenExpiry` (fields already exist)

### Server — Gmail
- [ ] Update `server/routes/gmail.js` (currently placeholder)
- [ ] `POST /api/gmail/create-draft` — Create draft in user's Gmail
- [ ] `POST /api/gmail/send` — Send an existing draft
- [ ] `GET /api/gmail/status` — Check if Gmail is connected

### Server — Calendar
- [ ] Update `server/routes/calendar.js` (currently placeholder)
- [ ] `GET /api/calendar/free-slots` — Find available meeting slots
  - Uses Calendar API freebusy.query
  - Respects user working hours settings
  - Returns available time slots
- [ ] Integrate free slots into draft generation — AI can suggest specific times

### Client — Settings
- [ ] Gmail section: "Connect Gmail" button → OAuth → shows connected email + "Disconnect"
- [ ] Calendar section: "Connect Google Calendar" button → same → shows connected + "Disconnect"

### Client — NewContact
- [ ] After draft finalized: "Create Gmail Draft" or "Send via Gmail" options
- [ ] Show suggested meeting times from calendar in availability section

### Environment Variables
- [ ] `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

## Validation
- [ ] OAuth flow completes and tokens stored
- [ ] Can create a draft in Gmail from the app
- [ ] Calendar free slots return correct availability
- [ ] Token refresh works
- [ ] Disconnect removes tokens

**Commit message when done:** `Fixes #10: P0-10: Settings — Gmail & Google Calendar OAuth integration`

---

## Issue #11: P0-11: Batch LinkedIn PDF Import — each PDF creates a separate contact

## Context
Currently, uploading a LinkedIn PDF creates one contact. The GScript flow supports uploading **multiple PDFs at once**, where each PDF is parsed into its own contact row. This is critical for users who download 10+ LinkedIn profiles in a session and want to import them all at once.

**Distinct from #6** — issue #6 is about merging multiple files into one contact parse. This issue is about N files → N contacts.

## Changes Required

### Client — `NewContact.jsx` (or new `BulkImport.jsx` page)
- [ ] Multi-file input: `<input type="file" multiple accept=".pdf,.png,.jpeg,.webp">`
- [ ] Progress UI: "Processing 3 of 7: john-doe.pdf"
- [ ] Results summary: checkmark/X per file with name + company extracted
- [ ] Auto-close or redirect to dashboard after completion

### Server — new endpoint `POST /api/contacts/bulk-parse`
- [ ] Accept array of files via multipart form-data
- [ ] Process files **sequentially** (not parallel — avoid Anthropic rate limits)
- [ ] For each file: parse with AI → create Contact in DB → return result
- [ ] Return array of `{ success, firstName, lastName, company, error }`

### Dashboard
- [ ] Add "Import LinkedIn PDFs" button alongside "New Contact"

## Reference
`importLinkedInPDF()` in GScript — lines 67-236 of `outreach-gscript-final.js`

## Validation
- [ ] Upload 5 PDFs → 5 separate contacts created
- [ ] Progress indicator updates per file
- [ ] Failed files don't block remaining files
- [ ] Results show per-file success/failure with details

**Commit message when done:** `Fixes #11: P0-11: Batch LinkedIn PDF Import — each PDF creates a separate contact`

---

## Issue #12: P0-12: Batch Hunter.io email lookup for selected contacts

## Context
Currently, email lookup is one contact at a time from the contact detail page. The GScript flow lets you select multiple rows and run Hunter.io on all of them in one action. Saves significant time when importing 10+ contacts.

## Changes Required

### Client — `Dashboard.jsx`
- [ ] Add checkbox column to contact table (select all / individual)
- [ ] "Look Up Emails" bulk action button (appears when contacts selected)
- [ ] Progress indicator during bulk lookup
- [ ] Results summary modal: "Found: 7 | Not found: 2 | Errors: 1"

### Server — new endpoint `POST /api/contacts/bulk-find-email`
- [ ] Accept `{ contactIds: string[] }`
- [ ] Process sequentially with **1.5s delay** between calls (Hunter rate limit)
- [ ] For each contact: domain search → email finder → update DB
- [ ] Update `emailStatus` per contact (Found - Work / Not Found)
- [ ] Return summary: `{ found, notFound, errors, results[] }`

## Reference
`lookupEmails()` in GScript — lines 759-831 of `outreach-gscript-final.js`

## Validation
- [ ] Select 5 contacts → bulk lookup runs on all 5
- [ ] Contacts without company/name are skipped gracefully
- [ ] Email status updates in real-time on dashboard
- [ ] Rate limiting (1.5s gap) prevents Hunter.io 429s

**Commit message when done:** `Fixes #12: P0-12: Batch Hunter.io email lookup for selected contacts`

---

## Issue #13: P1-13: Email template system with merge fields + motivation paragraph

## Context
Currently, Penn Reach generates a unique AI email for every contact from scratch. The GScript flow uses a **reusable email template** with merge fields. This is faster, more consistent, and lets users control their exact messaging.

## Changes Required

### Database — `schema.prisma`
- [ ] Add to User model: `emailTemplateSubject`, `emailTemplateBody`, `motivationParagraph`

### Client — `Settings.jsx` (new "Email Template" section)
- [ ] Subject input (default: `Wharton MBA Interested in {{Company}}`)
- [ ] Body textarea (default template with merge fields)
- [ ] Merge fields reference: `{{FirstName}}`, `{{LastName}}`, `{{Company}}`, `{{Role}}`, `{{Availability}}`, `{{MotivationParagraph}}`
- [ ] Motivation Paragraph textarea — `{{Company}}` inside gets replaced per-contact

### Server — draft generation
- [ ] Add template mode (merge field replacement) alongside AI mode
- [ ] `fillMergeFields()` function for all placeholders

## Reference
`setupTemplate()` + `fillMergeFields()` in GScript — lines 461-978

## Validation
- [ ] Template saves and persists
- [ ] Merge fields correctly replaced per contact
- [ ] User can switch between template mode and AI mode

**Commit message when done:** `Fixes #13: P1-13: Email template system with merge fields + motivation paragraph`

---

## Issue #14: P1-14: Batch Gmail draft creation for selected contacts

## Context
The GScript flow selects multiple contacts and creates Gmail drafts for all in one action. Depends on Gmail OAuth (#10) and email template system.

## Dependencies
- #10 (Gmail & Calendar OAuth)
- Email template with merge fields (see related issue)

## Changes Required

### Client — `Dashboard.jsx`
- [ ] "Create Drafts" bulk action button (same checkbox as batch email lookup)
- [ ] Confirmation dialog + progress indicator
- [ ] Results summary: "Created: 4 | Skipped: 1"

### Server — `POST /api/contacts/bulk-draft`
- [ ] Fetch calendar availability once, reuse for all
- [ ] Per contact: fill template → HTML convert → Gmail API draft → update status
- [ ] Return summary

## Reference
`createDrafts()` in GScript — lines 866-956

## Validation
- [ ] Select contacts with emails → Gmail drafts created
- [ ] Contacts without email skipped
- [ ] Availability auto-populated from calendar
- [ ] Statuses update to "Draft Created"

**Commit message when done:** `Fixes #14: P1-14: Batch Gmail draft creation for selected contacts`

---


