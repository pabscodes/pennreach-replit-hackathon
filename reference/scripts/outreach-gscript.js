// ============================================================
// COLD OUTREACH TRACKER — Google Apps Script
// ============================================================
// Features:
//   1. Hunter.io work email lookup
//   2. Gmail draft creation with merge fields
//   3. Google Calendar integration for availability
//      - Reads your calendar to find free slots
//      - 15-min buffer on each side, 1-hour minimum
//      - 10 AM - 5 PM EST only
//      - Ignores events starting with BEPP/hold/tentative
//   4. Claude integration for motivation paragraphs
//   5. LinkedIn PDF parsing to auto-fill contacts
// ============================================================

const HUNTER_API_KEY = 'YOUR_HUNTER_API_KEY_HERE';  // Get yours at https://hunter.io/api-keys
const ANTHROPIC_API_KEY = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
const TRACKER_SHEET_NAME = 'Outreach Tracker';
const TEMPLATE_SHEET_NAME = 'Email Template';

// ──────────────────────────────────────────────
// MENU
// ──────────────────────────────────────────────

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Outreach')
    .addItem('Import contact from LinkedIn PDF', 'importLinkedInPDF')
    .addItem('Look up work emails (Hunter.io)', 'lookupEmails')
    .addItem('Write motivation paragraph (Claude)', 'writeMotivationParagraph')
    .addItem('Create Gmail drafts for selected rows', 'createDrafts')
    .addSeparator()
    .addSubMenu(ui.createMenu('Setup Actions')
      .addItem('Set up tracker tab', 'setupTracker')
      .addItem('Set up email template tab', 'setupTemplate')
      .addItem('Set Anthropic API Key', 'setAnthropicApiKey'))
    .addToUi();
}

// ──────────────────────────────────────────────
// API KEY SETUP
// ──────────────────────────────────────────────

function setAnthropicApiKey() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt(
    'Set Anthropic API Key',
    'Enter your Anthropic API key (starts with sk-ant-):',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() === ui.Button.OK) {
    var apiKey = response.getResponseText().trim();
    if (apiKey.startsWith('sk-ant-')) {
      PropertiesService.getScriptProperties().setProperty('ANTHROPIC_API_KEY', apiKey);
      ui.alert('API key saved successfully!');
    } else {
      ui.alert('Invalid API key format. It should start with "sk-ant-".');
    }
  }
}

// ──────────────────────────────────────────────
// LINKEDIN PDF IMPORT
// ──────────────────────────────────────────────

function importLinkedInPDF() {
  var ui = SpreadsheetApp.getUi();

  // Check for API key
  var apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!apiKey) {
    ui.alert('Anthropic API key not set.\n\nGo to Outreach > Setup Actions > "Set Anthropic API Key" first.');
    return;
  }

  // Show file picker instructions
  var html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; padding: 15px; }
      h3 { margin-top: 0; color: #333; }
      .step { margin: 12px 0; padding: 10px; background: #f5f5f5; border-radius: 4px; }
      .step-num { font-weight: bold; color: #4a86e8; }
      input[type="file"] { margin: 10px 0; }
      button { background: #4a86e8; color: white; border: none; padding: 10px 20px;
               border-radius: 4px; cursor: pointer; font-size: 14px; }
      button:hover { background: #3a76d8; }
      button:disabled { background: #ccc; cursor: not-allowed; }
      #status { margin-top: 15px; padding: 10px; border-radius: 4px; display: none; }
      .loading { background: #fff3cd; color: #856404; }
      .success { background: #d4edda; color: #155724; }
      .error { background: #f8d7da; color: #721c24; }
      .results { margin-top: 10px; font-size: 13px; }
      .results div { padding: 4px 0; }
      .results .added { color: #155724; }
      .results .failed { color: #721c24; }
    </style>

    <h3>Import LinkedIn Profiles</h3>

    <div class="step">
      <span class="step-num">1.</span> Go to each LinkedIn profile and click "More" → "Save to PDF"
    </div>
    <div class="step">
      <span class="step-num">2.</span> Upload the downloaded PDFs below (select multiple):
    </div>

    <input type="file" id="pdfFiles" accept=".pdf" multiple />
    <br><br>
    <button id="uploadBtn" onclick="uploadFiles()">Parse & Add to Tracker</button>

    <div id="status"></div>
    <div id="results" class="results"></div>

    <script>
      var totalFiles = 0;
      var processedFiles = 0;
      var successCount = 0;
      var failCount = 0;
      var resultsLog = [];

      function uploadFiles() {
        var fileInput = document.getElementById('pdfFiles');
        var status = document.getElementById('status');
        var results = document.getElementById('results');
        var uploadBtn = document.getElementById('uploadBtn');

        if (!fileInput.files.length) {
          status.className = 'error';
          status.style.display = 'block';
          status.textContent = 'Please select at least one PDF file.';
          return;
        }

        totalFiles = fileInput.files.length;
        processedFiles = 0;
        successCount = 0;
        failCount = 0;
        resultsLog = [];
        results.innerHTML = '';

        uploadBtn.disabled = true;
        status.className = 'loading';
        status.style.display = 'block';
        status.textContent = 'Processing 1 of ' + totalFiles + '...';

        processNextFile(fileInput.files, 0);
      }

      function processNextFile(files, index) {
        if (index >= files.length) {
          showFinalResults();
          return;
        }

        var file = files[index];
        var reader = new FileReader();
        var status = document.getElementById('status');

        status.textContent = 'Processing ' + (index + 1) + ' of ' + totalFiles + ': ' + file.name;

        reader.onload = function(e) {
          var base64 = e.target.result.split(',')[1];
          google.script.run
            .withSuccessHandler(function(result) {
              processedFiles++;
              if (result.success) {
                successCount++;
                resultsLog.push({
                  success: true,
                  name: result.firstName + ' ' + result.lastName,
                  detail: result.role + ' at ' + result.company
                });
              } else {
                failCount++;
                resultsLog.push({
                  success: false,
                  name: file.name,
                  detail: result.error
                });
              }
              processNextFile(files, index + 1);
            })
            .withFailureHandler(function(error) {
              processedFiles++;
              failCount++;
              resultsLog.push({
                success: false,
                name: file.name,
                detail: error.message
              });
              processNextFile(files, index + 1);
            })
            .parseLinkedInPDF(base64);
        };

        reader.readAsDataURL(file);
      }

      function showFinalResults() {
        var status = document.getElementById('status');
        var results = document.getElementById('results');
        var uploadBtn = document.getElementById('uploadBtn');

        if (failCount === 0) {
          status.className = 'success';
          status.textContent = 'Added ' + successCount + ' contact' + (successCount !== 1 ? 's' : '') + '!';
        } else if (successCount === 0) {
          status.className = 'error';
          status.textContent = 'Failed to add any contacts.';
        } else {
          status.className = 'loading';
          status.textContent = 'Added ' + successCount + ', failed ' + failCount + '.';
        }

        var html = '';
        for (var i = 0; i < resultsLog.length; i++) {
          var r = resultsLog[i];
          if (r.success) {
            html += '<div class="added">✓ ' + r.name + ' (' + r.detail + ')</div>';
          } else {
            html += '<div class="failed">✗ ' + r.name + ': ' + r.detail + '</div>';
          }
        }
        results.innerHTML = html;

        uploadBtn.disabled = false;
        setTimeout(function() { google.script.host.close(); }, 4000);
      }
    </script>
  `)
  .setWidth(500)
  .setHeight(450);

  ui.showModalDialog(html, 'Import LinkedIn Profiles');
}

function parseLinkedInPDF(base64Data) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');

  if (!apiKey) {
    return { success: false, error: 'Anthropic API key not configured' };
  }

  try {
    var response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      payload: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Data
              }
            },
            {
              type: 'text',
              text: `Extract the following information from this LinkedIn profile PDF and return ONLY a JSON object with these exact keys:
{
  "firstName": "person's first name",
  "lastName": "person's last name",
  "company": "current company name",
  "role": "current job title",
  "linkedinUrl": "the LinkedIn profile URL (usually at top of PDF, format: linkedin.com/in/username)"
}

If a field cannot be determined, use an empty string. Return ONLY the JSON, no other text.`
            }
          ]
        }]
      }),
      muteHttpExceptions: true
    });

    var result = JSON.parse(response.getContentText());

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    var content = result.content[0].text;

    // Extract JSON from response (handle potential markdown code blocks)
    var jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: 'Could not parse response from Claude' };
    }

    var parsed = JSON.parse(jsonMatch[0]);

    // Add to tracker sheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(TRACKER_SHEET_NAME);

    if (!sheet) {
      return { success: false, error: 'Outreach Tracker tab not found. Set it up first.' };
    }

    // Find next empty row
    var lastRow = sheet.getLastRow();
    var newRow = lastRow + 1;

    // Write data: Outreach Status, Email Status, First Name, Last Name, Company, Role/Title, LinkedIn URL
    sheet.getRange(newRow, 1).setValue('Not Started');
    sheet.getRange(newRow, 2).setValue('Not Searched');
    sheet.getRange(newRow, 3).setValue(parsed.firstName || '');
    sheet.getRange(newRow, 4).setValue(parsed.lastName || '');
    sheet.getRange(newRow, 5).setValue(parsed.company || '');
    sheet.getRange(newRow, 6).setValue(parsed.role || '');
    sheet.getRange(newRow, 7).setValue(parsed.linkedinUrl || '');

    return {
      success: true,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      company: parsed.company,
      role: parsed.role,
      linkedinUrl: parsed.linkedinUrl
    };

  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ──────────────────────────────────────────────
// CLAUDE MOTIVATION PARAGRAPH
// ──────────────────────────────────────────────

function writeMotivationParagraph() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var trackerSheet = ss.getSheetByName(TRACKER_SHEET_NAME);

  if (!trackerSheet) {
    SpreadsheetApp.getUi().alert('Tracker tab not found. Run "Set up tracker tab" first.');
    return;
  }

  var selection = trackerSheet.getActiveRange();
  var row = selection.getRow();

  if (row < 2) {
    SpreadsheetApp.getUi().alert('Select a data row (not the header).');
    return;
  }

  var company = trackerSheet.getRange(row, 5).getValue();
  var firstName = trackerSheet.getRange(row, 3).getValue();
  var role = trackerSheet.getRange(row, 6).getValue();

  if (!company) {
    SpreadsheetApp.getUi().alert('No company found in selected row.');
    return;
  }

  var ui = SpreadsheetApp.getUi();
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family: Arial, sans-serif; padding: 10px;">' +
    '<h3 style="margin-top: 0;">Write Motivation Paragraph</h3>' +
    '<p><strong>Company:</strong> ' + company + '</p>' +
    '<p><strong>Contact:</strong> ' + firstName + ' (' + role + ')</p>' +
    '<hr>' +
    '<p>Open your terminal and run:</p>' +
    '<pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 13px;">claude</pre>' +
    '<p>Then type:</p>' +
    '<pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 13px;">/outreach-writer ' + company + '</pre>' +
    '<p style="color: #666; font-size: 12px; margin-top: 20px;">' +
    'Claude will ask for your motivation, help you workshop the paragraph, ' +
    'and save it for future reference.</p>' +
    '</div>'
  )
  .setWidth(400)
  .setHeight(320);

  ui.showModalDialog(html, 'Claude Integration');
}

// ──────────────────────────────────────────────
// SETUP: TRACKER TAB
// ──────────────────────────────────────────────

function setupTracker() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TRACKER_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(TRACKER_SHEET_NAME);
  }

  var headers = [
    'Outreach Status',
    'Email Status',
    'First Name',
    'Last Name',
    'Company',
    'Role/Title',
    'LinkedIn URL',
    'Personal Email',
    'Work Email',
    'Notes'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4a86e8');
  headerRange.setFontColor('#ffffff');
  headerRange.setHorizontalAlignment('center');

  sheet.setColumnWidth(1, 140);
  sheet.setColumnWidth(2, 130);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 120);
  sheet.setColumnWidth(5, 160);
  sheet.setColumnWidth(6, 180);
  sheet.setColumnWidth(7, 260);
  sheet.setColumnWidth(8, 230);
  sheet.setColumnWidth(9, 230);
  sheet.setColumnWidth(10, 260);

  var outreachStatuses = [
    'Not Started', 'Draft Created', 'Sent',
    'Follow-up Sent', 'Responded', 'Meeting Scheduled'
  ];
  var outreachRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(outreachStatuses, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 1, 200, 1).setDataValidation(outreachRule);

  var emailStatuses = [
    'Not Searched', 'Found - Personal', 'Found - Work',
    'Found - Both', 'Not Found', 'Verified', 'Bounced'
  ];
  var emailRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(emailStatuses, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 2, 200, 1).setDataValidation(emailRule);

  sheet.setFrozenRows(1);

  SpreadsheetApp.getUi().alert('Tracker tab created! Start adding contacts in row 2.');
}

// ──────────────────────────────────────────────
// SETUP: EMAIL TEMPLATE TAB
// ──────────────────────────────────────────────

function setupTemplate() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TEMPLATE_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(TEMPLATE_SHEET_NAME);
  }
  sheet.clear();

  sheet.getRange('A1').setValue('Subject Line:').setFontWeight('bold');
  sheet.getRange('B1').setValue('Wharton MBA Interested in {{Company}}');

  sheet.getRange('A3').setValue('Email Body (edit below):').setFontWeight('bold');
  sheet.getRange('A4').setValue(getDefaultTemplate()).setWrap(true);
  sheet.setColumnWidth(1, 900);

  sheet.getRange('A6').setValue('Merge Fields Reference:').setFontWeight('bold');
  sheet.getRange('A7').setValue(
    '{{FirstName}}  {{LastName}}  {{Company}}  {{Role}}  {{Availability}}  {{MotivationParagraph}}'
  ).setFontColor('#666666');
  sheet.getRange('A8').setValue(
    '{{Availability}} pulls free slots from your Google Calendar (10 AM - 5 PM, 1-hour min, 15-min buffers).\n' +
    '{{MotivationParagraph}} is your custom paragraph generated with Claude.'
  ).setFontColor('#999999').setFontStyle('italic');

  // Motivation paragraph storage
  sheet.getRange('A10').setValue('Motivation Paragraph (paste from Claude):').setFontWeight('bold');
  sheet.getRange('A11').setValue('').setWrap(true).setBackground('#fffde7');
  sheet.getRange('A11').setNote('Paste your Claude-generated motivation paragraph here. It will be merged into emails via {{MotivationParagraph}}.');

  SpreadsheetApp.getUi().alert(
    'Template tab created! Edit the subject and body in the "Email Template" sheet.\n\n' +
    'Use {{FirstName}}, {{LastName}}, {{Company}}, {{Role}}, {{Availability}}, and {{MotivationParagraph}} as merge fields.'
  );
}

function getDefaultTemplate() {
  return 'Hi {{FirstName}},\n\n' +
    'My name is Sam Lazarus, and I\'m a first-year MBA student at Wharton. ' +
    'I\'m reaching out because I\'d love to learn more about {{Company}} and your experience there.\n\n' +
    '{{MotivationParagraph}}\n\n' +
    'I know your schedule is busy, and I\'d be grateful for a brief 15-minute chat if you have time. ' +
    'My availability is below (all times EST):\n\n' +
    '{{Availability}}\n\n' +
    'Thank you for your time!\n\n' +
    'Best,\nSam Lazarus\n\n' +
    '--\nSam Lazarus\nMBA Candidate, Class of 2027\nThe Wharton School, University of Pennsylvania\n+1 (610) 613 4049 | smlzrs@wharton.upenn.edu';
}

// ──────────────────────────────────────────────
// AVAILABILITY GENERATOR (Google Calendar Integration)
// ──────────────────────────────────────────────
// Rules:
//   - 15-minute buffer after meetings end (need time to reset)
//   - 15-minute buffer before meetings start (need time to prep)
//   - NO buffer at day boundaries (10 AM start, 5 PM end)
//   - Minimum 1-hour window after buffers applied
//   - Times rounded to clean 15-min intervals (:00, :15, :30, :45)
//   - Only 10:00 AM - 5:00 PM EST
//   - Events starting with "BEPP", "hold", "tentative" (case-insensitive) are ignored
//   - Date range: tomorrow through two Fridays from tomorrow
// ──────────────────────────────────────────────

// Prefixes that mark events as ignorable (treated as free time)
var IGNORABLE_PREFIXES = ['bepp', 'hold', 'tentative'];

function generateAvailability() {
  var today = new Date();

  // Calculate start date: tomorrow (skip to Monday if weekend)
  var startDate = new Date(today);
  startDate.setDate(startDate.getDate() + 1);
  startDate.setHours(0, 0, 0, 0);
  while (startDate.getDay() === 0 || startDate.getDay() === 6) {
    startDate.setDate(startDate.getDate() + 1);
  }

  // Calculate end date: two Fridays from tomorrow
  var endDate = findSecondFriday(startDate);
  endDate.setHours(23, 59, 59, 999);

  // Get all calendar events in the date range
  var calendar = CalendarApp.getDefaultCalendar();
  var events = calendar.getEvents(startDate, endDate);

  // Build availability for each business day
  var lines = [];
  var cursor = new Date(startDate);
  var lastISOWeek = getISOWeek(cursor);
  var isFirstDay = true;

  while (cursor <= endDate) {
    var dow = cursor.getDay();

    // Skip weekends
    if (dow !== 0 && dow !== 6) {
      // Add blank line between weeks
      var currentWeek = getISOWeek(cursor);
      if (!isFirstDay && currentWeek !== lastISOWeek) {
        lines.push('');
        lastISOWeek = currentWeek;
      }
      isFirstDay = false;

      // Get free slots for this day
      var daySlots = getFreeSlots(cursor, events);

      if (daySlots.length > 0) {
        var dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dow];
        var monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][cursor.getMonth()];
        var dayNum = cursor.getDate();

        var slotsFormatted = daySlots.map(function(slot) {
          return formatTime(slot.start) + ' - ' + formatTime(slot.end);
        }).join(' , ');

        lines.push(dayName + ', ' + monthName + ' ' + dayNum + ': ' + slotsFormatted);
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return lines.join('\n');
}

function findSecondFriday(fromDate) {
  var cursor = new Date(fromDate);
  var fridayCount = 0;

  while (fridayCount < 2) {
    if (cursor.getDay() === 5) { // Friday
      fridayCount++;
      if (fridayCount === 2) {
        return cursor;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return cursor;
}

function getFreeSlots(date, allEvents) {
  // Define working hours: 10 AM - 5 PM
  var dayStart = new Date(date);
  dayStart.setHours(10, 0, 0, 0);
  var dayEnd = new Date(date);
  dayEnd.setHours(17, 0, 0, 0);

  // Filter events for this specific day
  var dayEvents = allEvents.filter(function(event) {
    var eventStart = event.getStartTime();
    var eventEnd = event.getEndTime();
    var eventTitle = event.getTitle().toLowerCase();

    // Check if event overlaps with this day's working hours
    var overlaps = eventStart < dayEnd && eventEnd > dayStart;
    if (!overlaps) return false;

    // Check if event should be ignored
    for (var i = 0; i < IGNORABLE_PREFIXES.length; i++) {
      if (eventTitle.indexOf(IGNORABLE_PREFIXES[i]) === 0) {
        return false; // Ignore this event (treat as free time)
      }
    }

    return true;
  });

  // Sort events by start time
  dayEvents.sort(function(a, b) {
    return a.getStartTime() - b.getStartTime();
  });

  // Special case: if no events, the whole day is free (no buffers needed at boundaries)
  if (dayEvents.length === 0) {
    return [{ start: new Date(dayStart), end: new Date(dayEnd) }];
  }

  // Find free slots
  var freeSlots = [];
  var currentStart = dayStart;

  for (var i = 0; i < dayEvents.length; i++) {
    var event = dayEvents[i];
    var eventStart = event.getStartTime();
    var eventEnd = event.getEndTime();

    // Clamp event times to working hours
    if (eventStart < dayStart) eventStart = new Date(dayStart);
    if (eventEnd > dayEnd) eventEnd = new Date(dayEnd);

    // If there's a gap before this event, it's a potential free slot
    if (eventStart > currentStart) {
      var slotStart = new Date(currentStart);
      var slotEnd = new Date(eventStart);

      // Apply 15-min buffer ONLY if slot doesn't start at day boundary (10 AM)
      var startsAtDayStart = (slotStart.getTime() === dayStart.getTime());
      if (!startsAtDayStart) {
        // Buffer after previous meeting ended
        slotStart.setMinutes(slotStart.getMinutes() + 15);
        slotStart = roundUpTo15(slotStart);
      }

      // Apply 15-min buffer before this meeting starts
      slotEnd.setMinutes(slotEnd.getMinutes() - 15);
      slotEnd = roundDownTo15(slotEnd);

      // Check if slot is at least 1 hour after buffers
      var durationMs = slotEnd - slotStart;
      var durationMinutes = durationMs / (1000 * 60);

      if (durationMinutes >= 60) {
        freeSlots.push({ start: slotStart, end: slotEnd });
      }
    }

    // Move current position past this event
    if (eventEnd > currentStart) {
      currentStart = new Date(eventEnd);
    }
  }

  // Check for free slot after last event until end of day
  if (currentStart < dayEnd) {
    var slotStart = new Date(currentStart);
    var slotEnd = new Date(dayEnd);

    // Apply 15-min buffer after last meeting ended, round up
    slotStart.setMinutes(slotStart.getMinutes() + 15);
    slotStart = roundUpTo15(slotStart);

    // No buffer at day end (5 PM) - meeting can end right at 5

    var durationMs = slotEnd - slotStart;
    var durationMinutes = durationMs / (1000 * 60);

    if (durationMinutes >= 60) {
      freeSlots.push({ start: slotStart, end: slotEnd });
    }
  }

  return freeSlots;
}

// Round time UP to nearest 15-minute interval (:00, :15, :30, :45)
function roundUpTo15(date) {
  var d = new Date(date);
  var minutes = d.getMinutes();
  var remainder = minutes % 15;
  if (remainder !== 0) {
    d.setMinutes(minutes + (15 - remainder));
  }
  d.setSeconds(0);
  d.setMilliseconds(0);
  return d;
}

// Round time DOWN to nearest 15-minute interval (:00, :15, :30, :45)
function roundDownTo15(date) {
  var d = new Date(date);
  var minutes = d.getMinutes();
  var remainder = minutes % 15;
  if (remainder !== 0) {
    d.setMinutes(minutes - remainder);
  }
  d.setSeconds(0);
  d.setMilliseconds(0);
  return d;
}

function formatTime(date) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  if (hours === 0) hours = 12;

  var minutesStr = minutes < 10 ? '0' + minutes : '' + minutes;

  return hours + ':' + minutesStr + ' ' + ampm;
}

function getISOWeek(date) {
  var d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  var week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

// ──────────────────────────────────────────────
// HUNTER.IO EMAIL LOOKUP
// ──────────────────────────────────────────────

function lookupEmails() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TRACKER_SHEET_NAME);

  if (!sheet) {
    SpreadsheetApp.getUi().alert('Tracker tab not found. Run "Set up tracker tab" first.');
    return;
  }

  var selection = sheet.getActiveRange();
  var startRow = selection.getRow();
  var numRows = selection.getNumRows();

  if (startRow < 2) {
    SpreadsheetApp.getUi().alert('Select data rows (not the header) to look up.');
    return;
  }

  var ui = SpreadsheetApp.getUi();
  var confirm = ui.alert(
    'Hunter.io Lookup',
    'Look up work emails for ' + numRows + ' selected row(s)?',
    ui.ButtonSet.OK_CANCEL
  );
  if (confirm !== ui.Button.OK) return;

  var found = 0;
  var notFound = 0;
  var errors = 0;

  for (var i = 0; i < numRows; i++) {
    var row = startRow + i;
    var firstName = sheet.getRange(row, 3).getValue();
    var lastName = sheet.getRange(row, 4).getValue();
    var company = sheet.getRange(row, 5).getValue();

    if (!firstName || !lastName || !company) {
      continue;
    }

    try {
      var result = hunterEmailFinder(firstName, lastName, company);

      if (result.email) {
        sheet.getRange(row, 9).setValue(result.email);
        var currentStatus = sheet.getRange(row, 2).getValue();
        if (currentStatus === 'Found - Personal') {
          sheet.getRange(row, 2).setValue('Found - Both');
        } else {
          sheet.getRange(row, 2).setValue('Found - Work');
        }
        found++;
      } else {
        if (!sheet.getRange(row, 2).getValue() ||
            sheet.getRange(row, 2).getValue() === 'Not Searched') {
          sheet.getRange(row, 2).setValue('Not Found');
        }
        notFound++;
      }
    } catch (e) {
      Logger.log('Error looking up row ' + row + ': ' + e.message);
      errors++;
    }

    Utilities.sleep(1500);
  }

  ui.alert(
    'Hunter.io Lookup Complete',
    'Found: ' + found + '\nNot found: ' + notFound + '\nErrors: ' + errors,
    ui.ButtonSet.OK
  );
}

function hunterEmailFinder(firstName, lastName, company) {
  var domainUrl = 'https://api.hunter.io/v2/domain-search?company=' +
    encodeURIComponent(company) + '&api_key=' + HUNTER_API_KEY;

  var domainResp = UrlFetchApp.fetch(domainUrl, { muteHttpExceptions: true });
  var domainData = JSON.parse(domainResp.getContentText());

  if (!domainData.data || !domainData.data.domain) {
    return { email: null };
  }

  var domain = domainData.data.domain;

  var finderUrl = 'https://api.hunter.io/v2/email-finder?domain=' +
    encodeURIComponent(domain) +
    '&first_name=' + encodeURIComponent(firstName) +
    '&last_name=' + encodeURIComponent(lastName) +
    '&api_key=' + HUNTER_API_KEY;

  var finderResp = UrlFetchApp.fetch(finderUrl, { muteHttpExceptions: true });
  var finderData = JSON.parse(finderResp.getContentText());

  if (finderData.data && finderData.data.email) {
    return { email: finderData.data.email };
  }

  return { email: null };
}

// ──────────────────────────────────────────────
// GMAIL DRAFT CREATOR
// ──────────────────────────────────────────────

function createDrafts() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var trackerSheet = ss.getSheetByName(TRACKER_SHEET_NAME);
  var templateSheet = ss.getSheetByName(TEMPLATE_SHEET_NAME);

  if (!trackerSheet) {
    SpreadsheetApp.getUi().alert('Tracker tab not found. Run "Set up tracker tab" first.');
    return;
  }
  if (!templateSheet) {
    SpreadsheetApp.getUi().alert('Template tab not found. Run "Set up email template tab" first.');
    return;
  }

  var subjectTemplate = templateSheet.getRange('B1').getValue();
  var bodyTemplate = templateSheet.getRange('A4').getValue();
  var motivationParagraph = templateSheet.getRange('A11').getValue();

  if (!subjectTemplate || !bodyTemplate) {
    SpreadsheetApp.getUi().alert('Email template is empty. Set up the template first.');
    return;
  }

  if (!motivationParagraph || motivationParagraph.trim() === '') {
    var ui = SpreadsheetApp.getUi();
    var proceed = ui.alert(
      'Missing Motivation Paragraph',
      'Cell A11 is empty. Drafts will be created with {{MotivationParagraph}} as placeholder.\n\n' +
      'Use Outreach > "Write motivation paragraph (Claude)" to generate one first.\n\n' +
      'Continue anyway?',
      ui.ButtonSet.YES_NO
    );
    if (proceed !== ui.Button.YES) return;
    motivationParagraph = '{{MotivationParagraph}}';
  }

  var selection = trackerSheet.getActiveRange();
  var startRow = selection.getRow();
  var numRows = selection.getNumRows();

  if (startRow < 2) {
    SpreadsheetApp.getUi().alert('Select data rows (not the header).');
    return;
  }

  var ui = SpreadsheetApp.getUi();
  var confirm = ui.alert(
    'Create Drafts',
    'Create Gmail drafts for ' + numRows + ' selected row(s)?\n\n' +
    'Drafts will appear in your Gmail Drafts folder for review before sending.',
    ui.ButtonSet.OK_CANCEL
  );
  if (confirm !== ui.Button.OK) return;

  var availability = generateAvailability();
  var created = 0;
  var skipped = 0;

  for (var i = 0; i < numRows; i++) {
    var row = startRow + i;
    var firstName  = trackerSheet.getRange(row, 3).getValue();
    var lastName   = trackerSheet.getRange(row, 4).getValue();
    var company    = trackerSheet.getRange(row, 5).getValue();
    var role       = trackerSheet.getRange(row, 6).getValue();
    var persEmail  = trackerSheet.getRange(row, 8).getValue();
    var workEmail  = trackerSheet.getRange(row, 9).getValue();

    var toEmails = [persEmail, workEmail].filter(function(e) { return e; }).join(', ');

    if (!firstName || !toEmails) {
      skipped++;
      continue;
    }

    var subject = fillMergeFields(subjectTemplate, firstName, lastName, company, role, availability, motivationParagraph);
    var body    = fillMergeFields(bodyTemplate, firstName, lastName, company, role, availability, motivationParagraph);
    var htmlBody = plainTextToHtml(body);

    GmailApp.createDraft(toEmails, subject, '', { htmlBody: htmlBody });

    trackerSheet.getRange(row, 1).setValue('Draft Created');
    created++;
  }

  ui.alert(
    'Drafts Created',
    'Created: ' + created + '\nSkipped (missing name or email): ' + skipped +
    '\n\nAvailability was auto-populated from your Google Calendar.\nCheck your Gmail Drafts folder to review before sending.',
    ui.ButtonSet.OK
  );
}

function plainTextToHtml(text) {
  var paragraphs = text.split(/\n\n+/);
  var html = paragraphs.map(function(p) {
    return '<p style="margin:0 0 12px 0;font-family:Arial,sans-serif;font-size:14px;color:#222;">' +
      p.replace(/\n/g, '<br>') + '</p>';
  }).join('');
  return '<div>' + html + '</div>';
}

function fillMergeFields(template, firstName, lastName, company, role, availability, motivationParagraph) {
  // Replace {{Company}} in motivation paragraph first, then insert it
  var processedMotivation = (motivationParagraph || '').replace(/\{\{Company\}\}/g, company || '');

  return template
    .replace(/\{\{MotivationParagraph\}\}/g, processedMotivation)
    .replace(/\{\{FirstName\}\}/g, firstName || '')
    .replace(/\{\{LastName\}\}/g, lastName || '')
    .replace(/\{\{Company\}\}/g, company || '')
    .replace(/\{\{Role\}\}/g, role || '')
    .replace(/\{\{Availability\}\}/g, availability || '');
}
