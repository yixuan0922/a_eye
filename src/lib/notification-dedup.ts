/**
 * Notification deduplication tracker
 * Prevents sending duplicate notifications for the same violation within a time window
 */

interface NotificationKey {
  type: 'ppe' | 'zone' | 'unauthorized';
  personName: string;
  location: string;
  timestamp: number;
}

// Store recent notifications with their timestamps
const recentNotifications = new Map<string, number>();

// Clean up old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  const CLEANUP_THRESHOLD = 30 * 60 * 1000; // 30 minutes

  for (const [key, timestamp] of recentNotifications.entries()) {
    if (now - timestamp > CLEANUP_THRESHOLD) {
      recentNotifications.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate a unique key for a notification
 */
function generateNotificationKey(
  type: 'ppe' | 'zone' | 'unauthorized',
  personName: string,
  location: string
): string {
  return `${type}:${personName}:${location}`.toLowerCase();
}

/**
 * Check if we should send a notification, preventing duplicates within the time window
 * @param type - Type of violation
 * @param personName - Name of the person
 * @param location - Location of the violation
 * @param dedupeWindowSeconds - Time window in seconds to deduplicate (default: 10)
 * @returns true if notification should be sent, false if it's a duplicate
 */
export function shouldSendNotification(
  type: 'ppe' | 'zone' | 'unauthorized',
  personName: string,
  location: string,
  dedupeWindowSeconds: number = 10
): boolean {
  const key = generateNotificationKey(type, personName, location);
  const now = Date.now();
  const lastSent = recentNotifications.get(key);

  if (lastSent) {
    const timeSinceLastSent = (now - lastSent) / 1000;

    if (timeSinceLastSent < dedupeWindowSeconds) {
      console.log(`🚫 Duplicate notification blocked:`, {
        type,
        personName,
        location,
        timeSinceLastSent: timeSinceLastSent.toFixed(2) + 's',
        dedupeWindow: dedupeWindowSeconds + 's'
      });
      return false;
    }
  }

  // Record this notification
  recentNotifications.set(key, now);
  console.log(`✅ Notification allowed:`, {
    type,
    personName,
    location
  });

  return true;
}

/**
 * Clear all notification history (useful for testing)
 */
export function clearNotificationHistory(): void {
  recentNotifications.clear();
}
