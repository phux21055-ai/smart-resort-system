/**
 * Gmail to Resort Booking Auto-Import System
 * Google Apps Script for monitoring Booking.com emails
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
// TODO: Replace these with your actual values
const API_URL = 'https://your-domain.vercel.app/api/bookings/import';
const API_SECRET = 'your-secret-key-here';

// Email search configuration
const SEARCH_QUERY = 'from:booking.com is:unread';
const MAX_EMAILS_PER_RUN = 10;
const EMAIL_LABEL = 'Resort/Processed'; // Optional: Create a label to organize processed emails

// ========== MAIN FUNCTION ==========
function syncBookingEmails() {
  Logger.log('=== Starting Gmail Sync ===');
  Logger.log('Time: ' + new Date().toISOString());

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
    const emailData = {
      subject: message.getSubject(),
      body: message.getPlainBody(),
      from: message.getFrom(),
      date: message.getDate().toISOString()
    };

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
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'X-Api-Secret': API_SECRET
      },
      payload: JSON.stringify(emailData),
      muteHttpExceptions: true // Don't throw on HTTP errors
    };

    const response = UrlFetchApp.fetch(API_URL, options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();

    Logger.log('API Response Code: ' + statusCode);
    Logger.log('API Response: ' + responseText);

    if (statusCode === 200) {
      const result = JSON.parse(responseText);
      return {
        success: result.success,
        data: result.booking,
        error: result.error || null
      };
    } else {
      return {
        success: false,
        error: 'HTTP ' + statusCode + ': ' + responseText
      };
    }

  } catch (e) {
    return {
      success: false,
      error: 'API Request Failed: ' + e.message
    };
  }
}

// ========== TESTING FUNCTIONS ==========
/**
 * Test function to check configuration
 * Run this manually to verify your setup
 */
function testConfiguration() {
  Logger.log('=== Testing Configuration ===');
  Logger.log('API_URL: ' + API_URL);
  Logger.log('API_SECRET: ' + (API_SECRET ? '***' + API_SECRET.slice(-4) : 'NOT SET'));
  Logger.log('SEARCH_QUERY: ' + SEARCH_QUERY);

  // Test Gmail access
  try {
    const testSearch = GmailApp.search(SEARCH_QUERY, 0, 1);
    Logger.log('✅ Gmail access OK - Found ' + testSearch.length + ' email(s)');
  } catch (e) {
    Logger.log('❌ Gmail access ERROR: ' + e.message);
  }

  // Test API connectivity
  try {
    const testData = {
      subject: 'Test Email',
      body: 'This is a test',
      from: 'test@booking.com',
      date: new Date().toISOString()
    };

    const result = sendToAPI(testData);

    if (result.success) {
      Logger.log('✅ API connection OK');
    } else {
      Logger.log('⚠️  API returned error: ' + result.error);
    }
  } catch (e) {
    Logger.log('❌ API connection ERROR: ' + e.message);
  }

  Logger.log('=== Configuration Test Complete ===');
}

/**
 * Manual test with a specific email subject
 * Usage: testWithEmailSubject('Your booking confirmation')
 */
function testWithEmailSubject(subjectKeyword) {
  Logger.log('=== Testing with email containing: "' + subjectKeyword + '" ===');

  try {
    const searchQuery = 'from:booking.com subject:' + subjectKeyword;
    const threads = GmailApp.search(searchQuery, 0, 1);

    if (threads.length === 0) {
      Logger.log('No emails found matching: ' + searchQuery);
      return;
    }

    const message = threads[0].getMessages()[0];
    Logger.log('Found email: ' + message.getSubject());

    const result = processMessage(message);

    if (result.success) {
      Logger.log('✅ Test successful!');
      Logger.log('Parsed booking: ' + JSON.stringify(result.data, null, 2));
    } else {
      Logger.log('❌ Test failed: ' + result.error);
    }

  } catch (e) {
    Logger.log('❌ Test error: ' + e.message);
  }
}

/**
 * View the last 5 Booking.com emails without processing
 */
function viewRecentEmails() {
  Logger.log('=== Recent Booking.com Emails ===');

  try {
    const threads = GmailApp.search('from:booking.com', 0, 5);
    Logger.log('Found ' + threads.length + ' email(s)');

    for (let i = 0; i < threads.length; i++) {
      const messages = threads[i].getMessages();
      const message = messages[0]; // First message in thread

      Logger.log('\n--- Email ' + (i + 1) + ' ---');
      Logger.log('Subject: ' + message.getSubject());
      Logger.log('From: ' + message.getFrom());
      Logger.log('Date: ' + message.getDate());
      Logger.log('Is Unread: ' + message.isUnread());
      Logger.log('Preview: ' + message.getPlainBody().substring(0, 200) + '...');
    }

  } catch (e) {
    Logger.log('❌ Error: ' + e.message);
  }
}
