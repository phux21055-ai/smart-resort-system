/**
 * Gmail to Resort Booking Auto-Import System (Webhook Version)
 * Google Apps Script for monitoring Booking.com emails
 *
 * This version uses the /api/webhook/gmail-booking endpoint
 * Compatible with Vite + React + Vercel deployment
 *
 * Installation Instructions:
 * 1. Go to https://script.google.com
 * 2. Create a new project
 * 3. Copy and paste this entire code
 * 4. Update API_URL and API_SECRET with your values
 * 5. Save the project (File > Save)
 * 6. Set up a trigger:
 *    - Click on clock icon (Triggers) on the left sidebar
 *    - Click "Add Trigger"
 *    - Function: syncBookingEmails
 *    - Event source: Time-driven
 *    - Type of time based trigger: Minutes timer
 *    - Select minute interval: Every 5 or 10 minutes
 *    - Save
 * 7. Run the function once manually to authorize Gmail permissions
 */

// ========== CONFIGURATION ==========
// TODO: Replace these with your actual values from Vercel deployment
const API_BASE_URL = 'https://your-domain.vercel.app';
const API_SECRET = 'your-secret-key-here';

// Choose which endpoint to use
const USE_WEBHOOK_ENDPOINT = true; // Set to false to use /api/bookings/import instead

// Endpoint paths
const WEBHOOK_ENDPOINT = '/api/webhook/gmail-booking';
const LEGACY_ENDPOINT = '/api/bookings/import';

// Email search configuration
const SEARCH_QUERY = 'from:booking.com is:unread';
const MAX_EMAILS_PER_RUN = 10;
const EMAIL_LABEL = 'Resort/Processed';

// ========== MAIN FUNCTION ==========
function syncBookingEmails() {
  Logger.log('=== Starting Gmail Sync (Webhook Version) ===');
  Logger.log('Time: ' + new Date().toISOString());
  Logger.log('Endpoint: ' + (USE_WEBHOOK_ENDPOINT ? WEBHOOK_ENDPOINT : LEGACY_ENDPOINT));

  try {
    // Search for unread Booking.com emails
    const threads = GmailApp.search(SEARCH_QUERY, 0, MAX_EMAILS_PER_RUN);
    Logger.log('Found ' + threads.length + ' unread email(s) from Booking.com');

    if (threads.length === 0) {
      Logger.log('No new emails to process');
      return;
    }

    // Get or create label for processed emails
    let label = null;
    try {
      label = GmailApp.getUserLabelByName(EMAIL_LABEL);
      if (!label) {
        label = GmailApp.createLabel(EMAIL_LABEL);
        Logger.log('Created new label: ' + EMAIL_LABEL);
      }
    } catch (e) {
      Logger.log('Could not create/get label: ' + e.message);
    }

    // Process each thread
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < threads.length; i++) {
      const messages = threads[i].getMessages();

      for (let j = 0; j < messages.length; j++) {
        const message = messages[j];

        // Skip if already read
        if (!message.isUnread()) {
          Logger.log('Skipping already read message');
          continue;
        }

        try {
          const result = processMessage(message);

          if (result.success) {
            // Mark as read and add label
            message.markRead();
            if (label) {
              threads[i].addLabel(label);
            }
            successCount++;
            Logger.log('✅ Successfully processed: ' + message.getSubject());
          } else {
            errorCount++;
            Logger.log('❌ Failed to process: ' + message.getSubject());
            Logger.log('Error: ' + result.error);
          }

          // Add a small delay to avoid rate limiting
          Utilities.sleep(500);

        } catch (e) {
          errorCount++;
          Logger.log('❌ Exception processing message: ' + e.message);
        }
      }
    }

    Logger.log('=== Sync Complete ===');
    Logger.log('Success: ' + successCount + ', Errors: ' + errorCount);

  } catch (error) {
    Logger.log('❌ Critical Error in syncBookingEmails: ' + error.message);
    Logger.log('Stack: ' + error.stack);
  }
}

// ========== HELPER FUNCTIONS ==========
function processMessage(message) {
  try {
    // Extract email data
    let emailData;

    if (USE_WEBHOOK_ENDPOINT) {
      // Webhook format (more flexible)
      emailData = {
        email_content: message.getPlainBody(),
        subject: message.getSubject(),
        source: 'booking.com',
        sender: message.getFrom(),
        date: message.getDate().toISOString()
      };
    } else {
      // Legacy format
      emailData = {
        subject: message.getSubject(),
        body: message.getPlainBody(),
        from: message.getFrom(),
        date: message.getDate().toISOString()
      };
    }

    Logger.log('Processing: ' + emailData.subject);

    // Send to API
    const response = sendToAPI(emailData);

    return response;

  } catch (e) {
    return {
      success: false,
      error: e.message
    };
  }
}

function sendToAPI(emailData) {
  try {
    // Build API URL
    const endpoint = USE_WEBHOOK_ENDPOINT ? WEBHOOK_ENDPOINT : LEGACY_ENDPOINT;
    const apiUrl = API_BASE_URL + endpoint + '?secret=' + encodeURIComponent(API_SECRET);

    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'X-Api-Secret': API_SECRET
      },
      payload: JSON.stringify(emailData),
      muteHttpExceptions: true
    };

    Logger.log('Sending to: ' + endpoint);

    const response = UrlFetchApp.fetch(apiUrl, options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();

    Logger.log('API Response Code: ' + statusCode);

    if (statusCode === 200) {
      const result = JSON.parse(responseText);

      if (result.success) {
        const bookingData = result.data || result.booking;
        Logger.log('Parsed booking: ' + JSON.stringify(bookingData));

        return {
          success: true,
          data: bookingData,
          error: null
        };
      } else {
        return {
          success: false,
          error: result.message || 'API returned success: false'
        };
      }
    } else {
      Logger.log('API Error Response: ' + responseText);
      return {
        success: false,
        error: 'HTTP ' + statusCode + ': ' + responseText
      };
    }

  } catch (e) {
    Logger.log('Request failed: ' + e.message);
    return {
      success: false,
      error: 'API Request Failed: ' + e.message
    };
  }
}

// ========== TESTING FUNCTIONS ==========
/**
 * Test function to check configuration
 */
function testConfiguration() {
  Logger.log('=== Testing Configuration ===');
  Logger.log('API_BASE_URL: ' + API_BASE_URL);
  Logger.log('API_SECRET: ' + (API_SECRET ? '***' + API_SECRET.slice(-4) : 'NOT SET'));
  Logger.log('Endpoint: ' + (USE_WEBHOOK_ENDPOINT ? WEBHOOK_ENDPOINT : LEGACY_ENDPOINT));
  Logger.log('Full URL: ' + API_BASE_URL + (USE_WEBHOOK_ENDPOINT ? WEBHOOK_ENDPOINT : LEGACY_ENDPOINT));

  // Test Gmail access
  try {
    const testSearch = GmailApp.search(SEARCH_QUERY, 0, 1);
    Logger.log('✅ Gmail access OK - Found ' + testSearch.length + ' email(s)');
  } catch (e) {
    Logger.log('❌ Gmail access ERROR: ' + e.message);
  }

  // Test API connectivity with dummy data
  try {
    const testData = USE_WEBHOOK_ENDPOINT ? {
      email_content: 'Test booking confirmation for John Doe. Check-in: 2026-02-01, Check-out: 2026-02-03. Total: 3000 THB. Confirmation: TEST123',
      subject: 'Booking Confirmation - TEST123',
      source: 'booking.com',
      sender: 'test@booking.com',
      date: new Date().toISOString()
    } : {
      subject: 'Test Email',
      body: 'This is a test',
      from: 'test@booking.com',
      date: new Date().toISOString()
    };

    Logger.log('Sending test data...');
    const result = sendToAPI(testData);

    if (result.success) {
      Logger.log('✅ API connection OK');
      Logger.log('Response data: ' + JSON.stringify(result.data));
    } else {
      Logger.log('⚠️ API returned error: ' + result.error);
    }
  } catch (e) {
    Logger.log('❌ API connection ERROR: ' + e.message);
  }

  Logger.log('=== Configuration Test Complete ===');
}

/**
 * Process a single test email by subject keyword
 */
function testWithEmailSubject(subjectKeyword) {
  if (!subjectKeyword) {
    subjectKeyword = 'confirmation';
  }

  Logger.log('=== Testing with email containing: "' + subjectKeyword + '" ===');

  try {
    const searchQuery = 'from:booking.com subject:' + subjectKeyword;
    const threads = GmailApp.search(searchQuery, 0, 1);

    if (threads.length === 0) {
      Logger.log('No emails found matching: ' + searchQuery);
      Logger.log('Try running: testWithEmailSubject("your-search-term")');
      return;
    }

    const message = threads[0].getMessages()[0];
    Logger.log('Found email: ' + message.getSubject());
    Logger.log('From: ' + message.getFrom());
    Logger.log('Date: ' + message.getDate());

    const result = processMessage(message);

    if (result.success) {
      Logger.log('✅ Test successful!');
      Logger.log('Parsed booking data:');
      Logger.log(JSON.stringify(result.data, null, 2));
    } else {
      Logger.log('❌ Test failed: ' + result.error);
    }

  } catch (e) {
    Logger.log('❌ Test error: ' + e.message);
  }
}

/**
 * View recent Booking.com emails without processing
 */
function viewRecentEmails() {
  Logger.log('=== Recent Booking.com Emails ===');

  try {
    const threads = GmailApp.search('from:booking.com', 0, 5);
    Logger.log('Found ' + threads.length + ' email(s)');

    for (let i = 0; i < threads.length; i++) {
      const messages = threads[i].getMessages();
      const message = messages[0];

      Logger.log('\n--- Email ' + (i + 1) + ' ---');
      Logger.log('Subject: ' + message.getSubject());
      Logger.log('From: ' + message.getFrom());
      Logger.log('Date: ' + message.getDate());
      Logger.log('Is Unread: ' + message.isUnread());
      Logger.log('Preview: ' + message.getPlainBody().substring(0, 150) + '...');
    }

  } catch (e) {
    Logger.log('❌ Error: ' + e.message);
  }
}

/**
 * Manual run to process one email
 */
function processOneEmail() {
  Logger.log('=== Processing Single Email ===');

  try {
    const threads = GmailApp.search(SEARCH_QUERY, 0, 1);

    if (threads.length === 0) {
      Logger.log('No unread Booking.com emails found');
      return;
    }

    const message = threads[0].getMessages()[0];
    Logger.log('Processing: ' + message.getSubject());

    const result = processMessage(message);

    if (result.success) {
      message.markRead();
      Logger.log('✅ Success! Marked as read.');
      Logger.log('Data: ' + JSON.stringify(result.data, null, 2));
    } else {
      Logger.log('❌ Failed: ' + result.error);
    }

  } catch (e) {
    Logger.log('❌ Error: ' + e.message);
  }
}
