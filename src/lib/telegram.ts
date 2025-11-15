/**
 * Telegram Notification Service
 * Sends notifications to users via Telegram bot
 */

const TELEGRAM_BOT_URL = process.env.TELEGRAM_BOT_URL || 'http://localhost:3001';

export type NotificationType = 'violation' | 'ppe_violation' | 'unauthorized' | 'success';

interface SendNotificationParams {
  userId: string;
  message: string;
  type?: NotificationType;
}

interface SendBulkNotificationParams {
  userIds: string[];
  message: string;
  type?: NotificationType;
}

/**
 * Send notification to a single user
 */
export async function sendTelegramNotification({
  userId,
  message,
  type = 'violation'
}: SendNotificationParams): Promise<{ success: boolean; error?: string }> {
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

    if (!data.success) {
      console.error('Failed to send Telegram notification:', data.error);
      return { success: false, error: data.error };
    }

    console.log(`✅ Telegram notification sent to ${data.sentTo}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send notification to multiple users
 */
export async function sendBulkTelegramNotification({
  userIds,
  message,
  type = 'violation'
}: SendBulkNotificationParams): Promise<{ success: boolean; sent: number; failed: number }> {
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

    if (!data.success) {
      console.error('Failed to send bulk Telegram notifications');
      return { success: false, sent: 0, failed: userIds.length };
    }

    console.log(`✅ Telegram notifications: ${data.sent} sent, ${data.failed} failed`);
    return { success: true, sent: data.sent, failed: data.failed };
  } catch (error) {
    console.error('Error sending bulk Telegram notifications:', error);
    return { success: false, sent: 0, failed: userIds.length };
  }
}

/**
 * Format PPE violation message
 */
export function formatPPEViolationMessage(violation: {
  personName: string;
  location?: string;
  cameraName: string;
  ppeMissing: string[] | any;
  severity: string;
  detectionTimestamp: Date;
}): string {
  const missing = Array.isArray(violation.ppeMissing)
    ? violation.ppeMissing.join(', ')
    : JSON.stringify(violation.ppeMissing);

  return `
🦺 PPE VIOLATION DETECTED

Person: ${violation.personName}
Location: ${violation.location || 'Unknown'}
Camera: ${violation.cameraName}
Missing PPE: ${missing}
Severity: ${violation.severity.toUpperCase()}
Time: ${new Date(violation.detectionTimestamp).toLocaleString()}

Action Required: Please investigate immediately.
  `.trim();
}

/**
 * Format unauthorized access message
 */
export function formatUnauthorizedAccessMessage(access: {
  trackId: number;
  location: string;
  cameraName: string;
  durationSeconds: number;
  detectionTimestamp: Date;
  severity: string;
}): string {
  return `
🚨 UNAUTHORIZED ACCESS DETECTED

Track ID: ${access.trackId}
Location: ${access.location}
Camera: ${access.cameraName}
Duration: ${Math.round(access.durationSeconds)}s
Detection Time: ${new Date(access.detectionTimestamp).toLocaleString()}
Severity: ${access.severity.toUpperCase()}

IMMEDIATE ACTION REQUIRED!
  `.trim();
}

/**
 * Format general violation message
 */
export function formatViolationMessage(violation: {
  type: string;
  description: string;
  location?: string;
  severity: string;
  createdAt: Date;
}): string {
  return `
⚠️ VIOLATION DETECTED

Type: ${violation.type}
Description: ${violation.description}
Location: ${violation.location || 'Unknown'}
Severity: ${violation.severity.toUpperCase()}
Time: ${new Date(violation.createdAt).toLocaleString()}

Please review and take appropriate action.
  `.trim();
}

/**
 * Get admin user IDs for a site (placeholder - customize based on your needs)
 */
export async function getAdminUserIds(siteId: string): Promise<string[]> {
  // TODO: Replace with actual logic to get admin users from your database
  // For now, return demo user IDs
  // Example:
  // const admins = await db.user.findMany({
  //   where: { siteId, role: 'admin', isActive: true },
  //   select: { id: true }
  // });
  // return admins.map(a => a.id);

  return []; // Replace with actual user IDs
}
