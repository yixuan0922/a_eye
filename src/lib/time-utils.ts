/**
 * Time utility functions
 * Note: Database timestamps (createdAt, detectionTimestamp) are already in Singapore time
 */

/**
 * Check if a timestamp is within the specified seconds of current time
 * @param timestamp - The timestamp to check (already in SG time from database)
 * @param thresholdSeconds - The threshold in seconds (default: 60)
 * @returns true if the timestamp is within the threshold
 */
export function isWithinRecentTime(
  timestamp: Date,
  thresholdSeconds: number = 60
): boolean {
  // Get current time
  const now = new Date();

  // Calculate the difference in seconds
  const diffSeconds = Math.abs(now.getTime() - timestamp.getTime()) / 1000;

  // Debug logging
  console.log('🕐 Time check:', {
    currentTime: now.toISOString(),
    detectionTime: timestamp.toISOString(),
    differenceSeconds: diffSeconds.toFixed(2),
    thresholdSeconds,
    withinThreshold: diffSeconds <= thresholdSeconds
  });

  return diffSeconds <= thresholdSeconds;
}
