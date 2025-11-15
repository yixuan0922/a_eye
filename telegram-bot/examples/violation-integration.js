/**
 * Example integration code for sending Telegram notifications
 * when violations occur in the A_Eye system.
 *
 * Add these functions to your Next.js API routes or backend services.
 */

// Configuration - Update with your deployed bot URL
const TELEGRAM_BOT_URL = process.env.TELEGRAM_BOT_URL || 'http://localhost:3001';

/**
 * Send notification to Telegram bot
 */
async function sendTelegramNotification(userId, message, type = 'violation') {
  try {
    const response = await fetch(`${TELEGRAM_BOT_URL}/api/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        message,
        type
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Telegram notification sent to ${data.sentTo}`);
    } else {
      console.error('❌ Failed to send Telegram notification:', data.error);
    }

    return data;
  } catch (error) {
    console.error('❌ Error sending Telegram notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification to multiple users
 */
async function sendBulkTelegramNotification(userIds, message, type = 'violation') {
  try {
    const response = await fetch(`${TELEGRAM_BOT_URL}/api/send-bulk-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userIds,
        message,
        type
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Telegram notifications sent: ${data.sent} success, ${data.failed} failed`);
    }

    return data;
  } catch (error) {
    console.error('❌ Error sending bulk Telegram notifications:', error);
    return { success: false, error: error.message };
  }
}

// ====================
// EXAMPLE 1: PPE Violation
// ====================

async function notifyPPEViolation(violation, notifyUserIds) {
  const message = `
🦺 PPE VIOLATION DETECTED

Person: ${violation.personName}
Location: ${violation.location}
Camera: ${violation.cameraName}
Missing PPE: ${Array.isArray(violation.ppeMissing) ? violation.ppeMissing.join(', ') : violation.ppeMissing}
Severity: ${violation.severity.toUpperCase()}
Time: ${new Date(violation.detectionTimestamp).toLocaleString()}

Action Required: Please investigate immediately.
  `.trim();

  // Send to all specified users
  await sendBulkTelegramNotification(notifyUserIds, message, 'ppe_violation');
}

// Usage in your PPE violation API route:
// Example: /api/ppe-violations route
/*
export async function POST(request: Request) {
  const body = await request.json();

  // Create PPE violation in database
  const violation = await db.ppeViolation.create({
    data: {
      personName: body.personName,
      location: body.location,
      cameraName: body.cameraName,
      ppeMissing: body.ppeMissing,
      severity: body.severity,
      // ... other fields
    }
  });

  // Send Telegram notification to admins
  const adminUserIds = ['user123', 'user456']; // Get from your user management
  await notifyPPEViolation(violation, adminUserIds);

  return Response.json({ success: true, violation });
}
*/

// ====================
// EXAMPLE 2: Unauthorized Access
// ====================

async function notifyUnauthorizedAccess(access, notifyUserIds) {
  const message = `
🚨 UNAUTHORIZED ACCESS DETECTED

Track ID: ${access.trackId}
Location: ${access.location}
Camera: ${access.cameraName}
Duration: ${access.durationSeconds}s
Detection Time: ${new Date(access.detectionTimestamp).toLocaleString()}
Severity: ${access.severity.toUpperCase()}

IMMEDIATE ACTION REQUIRED!
  `.trim();

  await sendBulkTelegramNotification(notifyUserIds, message, 'unauthorized');
}

// Usage in your unauthorized access API route:
// Example: /api/unauthorized-access route
/*
export async function POST(request: Request) {
  const body = await request.json();

  const access = await db.unauthorizedAccess.create({
    data: {
      trackId: body.trackId,
      location: body.location,
      cameraName: body.cameraName,
      // ... other fields
    }
  });

  // Send urgent notification to security team
  const securityUserIds = ['user123', 'user456'];
  await notifyUnauthorizedAccess(access, securityUserIds);

  return Response.json({ success: true, access });
}
*/

// ====================
// EXAMPLE 3: General Violation
// ====================

async function notifyGeneralViolation(violation, notifyUserIds) {
  const message = `
⚠️ VIOLATION DETECTED

Type: ${violation.type}
Description: ${violation.description}
Location: ${violation.location || 'Unknown'}
Severity: ${violation.severity.toUpperCase()}
Time: ${new Date(violation.createdAt).toLocaleString()}

Please review and take appropriate action.
  `.trim();

  await sendBulkTelegramNotification(notifyUserIds, message, 'violation');
}

// ====================
// EXAMPLE 4: Personnel Approval
// ====================

async function notifyPersonnelApproved(personnel, userId) {
  const message = `
✅ PERSONNEL APPROVED

Name: ${personnel.name}
Employee ID: ${personnel.employeeId}
Department: ${personnel.department}
Position: ${personnel.position}
Access Level: ${personnel.accessLevel}

The personnel has been approved and can now access the site.
  `.trim();

  await sendTelegramNotification(userId, message, 'success');
}

// ====================
// EXAMPLE 5: Daily Summary
// ====================

async function sendDailySummary(summary, notifyUserIds) {
  const message = `
📊 DAILY SECURITY SUMMARY

Date: ${new Date().toLocaleDateString()}

PPE Violations: ${summary.ppeViolations}
Unauthorized Access: ${summary.unauthorizedAccess}
General Violations: ${summary.generalViolations}
Total Attendance: ${summary.attendance}

Active Cameras: ${summary.activeCameras}/${summary.totalCameras}

${summary.criticalIssues > 0 ? `⚠️ ${summary.criticalIssues} critical issues require attention!` : '✅ No critical issues'}
  `.trim();

  await sendBulkTelegramNotification(notifyUserIds, message, 'violation');
}

// ====================
// Helper: Get Users to Notify
// ====================

/**
 * Get list of user IDs who should be notified based on site and role
 */
async function getUsersToNotify(siteId, severity = 'medium') {
  // This is a placeholder - implement based on your database structure
  // You might want to:
  // 1. Get all users for a specific site
  // 2. Filter by role (admin, security, etc.)
  // 3. Filter by notification preferences

  // Example implementation:
  /*
  const users = await db.user.findMany({
    where: {
      siteId: siteId,
      isActive: true,
      role: {
        in: severity === 'high' ? ['admin', 'security'] : ['admin']
      },
      // Only include users who have linked Telegram
      telegramChatId: {
        not: null
      }
    },
    select: {
      id: true
    }
  });

  return users.map(u => u.id);
  */

  // For now, return demo user IDs
  return ['user123', 'user456'];
}

// Export functions
module.exports = {
  sendTelegramNotification,
  sendBulkTelegramNotification,
  notifyPPEViolation,
  notifyUnauthorizedAccess,
  notifyGeneralViolation,
  notifyPersonnelApproved,
  sendDailySummary,
  getUsersToNotify
};
