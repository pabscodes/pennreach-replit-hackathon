# Setup Instructions

## Prerequisites

You'll need accounts for:
- **Google account** (for Sheets, Gmail, Calendar)
- **Hunter.io** (free tier: 25 searches/month) - https://hunter.io
- **Anthropic API key** (for Claude AI features) - https://console.anthropic.com

## Step 1: Create the Google Sheet

1. Go to https://sheets.google.com and create a new spreadsheet
2. Name it something like "Cold Outreach Tracker"

## Step 2: Add the Google Apps Script

1. In your spreadsheet, go to **Extensions > Apps Script**
2. Delete any existing code in the editor
3. Open `scripts/outreach-gscript.js` from this folder
4. **IMPORTANT**: Replace the Hunter.io API key on line 16:
   ```js
   const HUNTER_API_KEY = 'YOUR_HUNTER_API_KEY_HERE';
   ```
   Get your key at https://hunter.io/api-keys
5. Copy the entire file contents and paste into the Apps Script editor
6. Click **Save** (Ctrl+S / Cmd+S)
7. Close the Apps Script editor and **reload the spreadsheet**

## Step 3: Run Initial Setup

After reloading, you'll see a new **"Outreach"** menu in the menu bar. (It may take a few seconds to appear.)

1. Click **Outreach > Setup Actions > Set up tracker tab**
   - This creates the "Outreach Tracker" tab with headers and dropdown validations
2. Click **Outreach > Setup Actions > Set up email template tab**
   - This creates the "Email Template" tab with the default email template
3. Click **Outreach > Setup Actions > Set Anthropic API Key**
   - Enter your Anthropic API key (starts with `sk-ant-`)
   - This is stored securely in Script Properties (not in the code)

## Step 4: Authorize Permissions

The first time you run any feature, Google will ask you to authorize permissions:
- **Google Sheets**: Read/write the tracker and template
- **Gmail**: Create draft emails
- **Google Calendar**: Read your calendar for availability
- **External URLs**: Call Hunter.io API, Anthropic API

Click through the authorization prompts. You may see a "This app isn't verified" warning — click "Advanced" > "Go to [your project name]" to proceed.

## Step 5: Customize the Email Template

Go to the **Email Template** tab and edit:
- **B1** (Subject line): Change to match your subject line style
- **A4** (Email body): Rewrite the email body to match your background and voice. Keep the `{{merge fields}}` where you want dynamic content inserted.

### Merge Fields Available

Use these anywhere in the subject or body:
- `{{FirstName}}` - Contact's first name
- `{{LastName}}` - Contact's last name
- `{{Company}}` - Contact's company
- `{{Role}}` - Contact's job title
- `{{Availability}}` - Auto-generated from your Google Calendar
- `{{MotivationParagraph}}` - Custom paragraph from cell A11 (supports `{{Company}}` within it)

## Step 6: Customize Calendar Rules (Optional)

If you want to change the availability window (e.g., different hours, different buffer times), edit these values in the script:

- **Working hours**: Search for `setHours(10, 0` and `setHours(17, 0` in `getFreeSlots()`
- **Buffer duration**: Search for `+ 15` and `- 15` in `getFreeSlots()`
- **Minimum slot duration**: Search for `>= 60` in `getFreeSlots()`
- **Ignored event prefixes**: Edit the `IGNORABLE_PREFIXES` array near the top of the script

## Step 7: Customize for Your Background (Optional)

The default email template references Sam Lazarus's Wharton MBA background. You'll want to:
1. Rewrite the email body in cell A4 to reflect your own background
2. Write your own motivation paragraphs for cell A11 (or adapt the examples in `example-paragraphs/`)

## Troubleshooting

**"Outreach" menu doesn't appear:**
- Reload the spreadsheet
- Check that the script saved correctly in Extensions > Apps Script

**Authorization errors:**
- Re-run any menu action to trigger the auth flow again
- Make sure you're using the same Google account for Sheets, Gmail, and Calendar

**Hunter.io returns no results:**
- Verify your API key is correct
- Check that you haven't exceeded the free tier limit (25/month)
- Some companies may not be in Hunter's database

**LinkedIn PDF parsing fails:**
- Make sure you're saving the PDF from LinkedIn's "Save to PDF" feature (not printing to PDF)
- Check that your Anthropic API key is set and valid

**Calendar availability is empty or wrong:**
- Make sure your default Google Calendar has events in it
- Events must be within the date range (tomorrow through two Fridays out)
- Check your timezone settings
