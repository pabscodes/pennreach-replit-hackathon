# Quick Reference Cheat Sheet

## Daily Workflow

### Adding a New Contact

1. Go to the LinkedIn profile > click **More** > **Save to PDF**
2. In Google Sheets: **Outreach > Import contact from LinkedIn PDF**
3. Upload the PDF(s) — name, company, role, and LinkedIn URL are auto-filled

### Finding Their Email

1. Select the row(s) you want to look up
2. **Outreach > Look up work emails (Hunter.io)**
3. Work emails populate in column I; status updates in column B

### Writing a Motivation Paragraph

1. Select the contact's row
2. **Outreach > Write motivation paragraph (Claude)**
3. Follow the instructions in the popup (uses Claude CLI)
4. Paste the generated paragraph into cell **A11** of the Email Template tab

### Creating Gmail Drafts

1. Paste your motivation paragraph into **Email Template > A11**
2. Go to **Outreach Tracker** tab, select the row(s) to email
3. **Outreach > Create Gmail drafts for selected rows**
4. Check your Gmail Drafts folder — review and send!

## Status Tracking

### Outreach Status (Column A)
| Status | Meaning |
|--------|---------|
| Not Started | Contact added, no action taken |
| Draft Created | Gmail draft generated |
| Sent | Email sent |
| Follow-up Sent | Follow-up email sent |
| Responded | Got a reply |
| Meeting Scheduled | Meeting booked |

### Email Status (Column B)
| Status | Meaning |
|--------|---------|
| Not Searched | Haven't looked up email yet |
| Found - Personal | Have personal email only |
| Found - Work | Have work email only |
| Found - Both | Have both emails |
| Not Found | Hunter.io couldn't find it |
| Verified | Manually verified email works |
| Bounced | Email bounced |

## Tips

- **Batch imports**: You can upload multiple LinkedIn PDFs at once
- **Batch email lookup**: Select multiple rows before running Hunter.io lookup
- **Batch drafts**: Select multiple rows to create drafts for all at once
- **Reuse paragraphs**: The same motivation paragraph in A11 works for all contacts at a company ({{Company}} is auto-replaced per row)
- **Review before sending**: Drafts are created in Gmail, not sent — always review first
- **Availability auto-updates**: Each time you create drafts, availability is freshly pulled from your calendar
