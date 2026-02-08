# Cold Outreach Toolkit

A semi-automated system for MBA networking outreach. Built on Google Sheets + Google Apps Script, with integrations to Gmail, Google Calendar, Hunter.io, and Claude AI.

## What It Does

This toolkit turns LinkedIn profiles into personalized Gmail drafts in a few clicks:

```
LinkedIn PDF  -->  Google Sheet  -->  Email Lookup  -->  Personalized Draft  -->  Gmail
```

### End-to-End Workflow

1. **Import contacts**: Save LinkedIn profiles as PDFs, upload them to the sheet. Claude AI parses out name, company, role, and LinkedIn URL automatically.

2. **Find work emails**: Select rows and run the Hunter.io lookup. It finds professional email addresses using the person's name + company.

3. **Write a motivation paragraph**: For each company, craft a personalized "Prior to Wharton" paragraph that connects your background to the company. Claude AI helps workshop it. The paragraph is saved and reusable for all contacts at that company.

4. **Create Gmail drafts**: Select rows, click "Create Drafts." The system:
   - Pulls your free time slots from Google Calendar (10 AM - 5 PM EST, 1-hour minimum, 15-min buffers between meetings)
   - Merges contact info, your motivation paragraph, and availability into the email template
   - Creates drafts in Gmail for you to review and send

### Merge Fields

The email template supports these placeholders:

| Field | Source |
|-------|--------|
| `{{FirstName}}` | Tracker sheet |
| `{{LastName}}` | Tracker sheet |
| `{{Company}}` | Tracker sheet |
| `{{Role}}` | Tracker sheet |
| `{{Availability}}` | Auto-generated from Google Calendar |
| `{{MotivationParagraph}}` | Cell A11 of Email Template tab |

### Google Sheet Structure

**Outreach Tracker tab** (your contact database):
| Outreach Status | Email Status | First Name | Last Name | Company | Role/Title | LinkedIn URL | Personal Email | Work Email | Notes |

**Email Template tab** (your email template):
- `B1`: Subject line
- `A4`: Email body (with merge fields)
- `A11`: Motivation paragraph (with `{{Company}}` placeholder)

### Calendar Availability Rules

When drafts are created, availability is auto-populated:
- **Date range**: Tomorrow through two Fridays from tomorrow (weekdays only)
- **Hours**: 10:00 AM - 5:00 PM EST
- **Buffers**: 15-min buffer after meetings (reset time) and before meetings (prep time)
- **Minimum slot**: 1 hour after buffers
- **Ignored events**: Events starting with "BEPP", "hold", or "tentative" (case-insensitive)
- **Format**: `Thu, Feb 5: 10:00 AM - 12:00 PM , 2:00 PM - 5:00 PM`

## Files in This Toolkit

```
Cold-Outreach-Toolkit/
  1-OVERVIEW.md              <-- You are here
  2-SETUP.md                 <-- Step-by-step installation guide
  3-CHEAT-SHEET.md           <-- Quick reference for daily use
  scripts/
    outreach-gscript.js      <-- The Google Apps Script (paste into Apps Script editor)
  example-paragraphs/
    Renovate Robotics.txt    <-- Example motivation paragraph
    Toast.txt                <-- Example motivation paragraph
    C&S Wholesale Grocers & Symbotic.txt  <-- Example motivation paragraph
```
