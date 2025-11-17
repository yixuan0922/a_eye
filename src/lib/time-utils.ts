/**
 * Time utility functions
 * NOTE: Database stores timestamps as Singapore local time
 * We treat the timestamp values as Singapore time directly (ignore UTC markers)
 */

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
  const detectionTimeSG = new Date(year, month, day, hours, minutes, seconds, ms);

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
