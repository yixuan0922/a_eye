/**
 * Time utility functions
 * NOTE: Database stores timestamps as Singapore local time
 * We treat the timestamp values as Singapore time directly (ignore UTC markers)
 */

/**
 * Convert a database timestamp (stored as Singapore time with UTC marker) to Singapore local time
 * @param timestamp - The timestamp from database (Singapore time with Z marker)
 * @returns Date object representing Singapore local time
 */
export function convertToSingaporeTime(timestamp: Date): Date {
  // Parse the timestamp as Singapore time (ignore the Z marker)
  // Extract the time components and recreate as a local date
  const year = timestamp.getUTCFullYear();
  const month = timestamp.getUTCMonth();
  const day = timestamp.getUTCDate();
  const hours = timestamp.getUTCHours();
  const minutes = timestamp.getUTCMinutes();
  const seconds = timestamp.getUTCSeconds();
  const ms = timestamp.getUTCMilliseconds();

  // Create a new date using these values as local Singapore time
  return new Date(year, month, day, hours, minutes, seconds, ms);
}

/**
 * Format a database timestamp to YYYY-MM-DD HH:MM:SS in Singapore timezone
 * (same format as Telegram notifications)
 * @param timestamp - The timestamp from database (Singapore time with Z marker)
 * @returns Formatted string in YYYY-MM-DD HH:MM:SS format
 */
export function formatSingaporeTimestamp(timestamp: Date): string {
  // Extract UTC components (which are actually Singapore local time values)
  const year = timestamp.getUTCFullYear();
  const month = String(timestamp.getUTCMonth() + 1).padStart(2, '0');
  const day = String(timestamp.getUTCDate()).padStart(2, '0');
  const hours = String(timestamp.getUTCHours()).padStart(2, '0');
  const minutes = String(timestamp.getUTCMinutes()).padStart(2, '0');
  const seconds = String(timestamp.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Get the start of today in Singapore timezone
 * @returns Date object for 00:00:00 today in Singapore time
 */
export function getSingaporeTodayStart(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/**
 * Get the end of today in Singapore timezone
 * @returns Date object for 23:59:59.999 today in Singapore time
 */
export function getSingaporeTodayEnd(): Date {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now;
}

/**
 * Get the start of current month in Singapore timezone
 * @returns Date object for 00:00:00 on the 1st of current month in Singapore time
 */
export function getSingaporeMonthStart(): Date {
  const now = new Date();
  now.setDate(1);
  now.setHours(0, 0, 0, 0);
  return now;
}

/**
 * Get the end of current month in Singapore timezone
 * @returns Date object for 23:59:59.999 on the last day of current month in Singapore time
 */
export function getSingaporeMonthEnd(): Date {
  const now = new Date();
  now.setMonth(now.getMonth() + 1, 0);
  now.setHours(23, 59, 59, 999);
  return now;
}

/**
 * Check if a timestamp is within the specified seconds of current time
 * @param timestamp - The timestamp from database (Singapore time)
 * @param thresholdSeconds - The threshold in seconds (default: 60)
 * @returns true if the timestamp is within the threshold
 */
export function isWithinRecentTime(
  timestamp: Date,
  thresholdSeconds: number = 60
): boolean {
  // Get current time
  const now = new Date();

  // Convert to Singapore time
  const detectionTimeSG = convertToSingaporeTime(timestamp);

  // Calculate the difference in seconds
  const diffSeconds = Math.abs(now.getTime() - detectionTimeSG.getTime()) / 1000;

  const isWithin = diffSeconds <= thresholdSeconds;

  // Only log when violation is within threshold (to reduce spam)
  if (isWithin) {
    console.log('✅ Recent violation detected:', {
      currentTime: now.toString(),
      detectionTime: detectionTimeSG.toString(),
      differenceSeconds: diffSeconds.toFixed(2),
      thresholdSeconds
    });
  }

  return isWithin;
}
