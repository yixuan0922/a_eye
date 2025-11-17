import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendBulkTelegramNotification, formatZoneIntrusionMessage } from "@/lib/telegram";
import { convertS3UrlToHttps } from "@/lib/s3";
import { isWithinRecentTime } from "@/lib/time-utils";
import { shouldSendNotification } from "@/lib/notification-dedup";

// Track which violations have already been notified to prevent duplicates
const notifiedViolations = new Map<string, number>();

// Clean up old entries every 10 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000; // 1 hour

  // Remove entries older than 1 hour
  for (const [id, timestamp] of notifiedViolations.entries()) {
    if (now - timestamp > ONE_HOUR) {
      notifiedViolations.delete(id);
    }
  }
}, 10 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId } = body;

    if (!siteId) {
      return NextResponse.json(
        { success: false, message: "siteId is required" },
        { status: 400 }
      );
    }

    // Get all zone intrusions for this site
    const allViolations = await db.violation.findMany({
      where: {
        siteId,
        type: "restricted_zone",
        status: "active",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const now = new Date();
    const recentViolations = [];

    // Filter violations that are within 60 seconds and haven't been notified yet
    for (const violation of allViolations) {
      // Use the Singapore time check to verify if the violation is within 60 seconds
      if (isWithinRecentTime(violation.createdAt, 60)) {
        // Check if we've already notified about this violation
        const lastNotified = notifiedViolations.get(violation.id);

        if (!lastNotified) {
          // Never notified before - add it
          recentViolations.push(violation);
          notifiedViolations.set(violation.id, now.getTime());
        }
      }
    }

    if (recentViolations.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No recent zone intrusions to notify",
        checked: allViolations.length,
        recent: 0,
      });
    }

    // Fetch linked Telegram users
    let adminUserIds: string[] = [];
    try {
      const TELEGRAM_BOT_URL = process.env.TELEGRAM_BOT_URL || 'http://localhost:3001';
      const usersResponse = await fetch(`${TELEGRAM_BOT_URL}/api/users`);

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        adminUserIds = usersData.users?.map((u: any) => u.userId) || [];
      }
    } catch (error) {
      console.error('Failed to fetch linked Telegram users:', error);
    }

    if (adminUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No linked Telegram users found",
        recentViolations: recentViolations.length,
      });
    }

    // Send notification for each recent violation
    const notificationResults = [];
    for (const violation of recentViolations) {
      // Extract person name and zone from description
      // Format: "Unknown detected in Restricted Zone" or "PersonName detected in ZoneName"
      const descParts = violation.description.split(' detected in ');
      const personName = descParts[0] || 'Unknown';
      const zoneName = descParts[1] || 'Restricted Zone';

      // Check for duplicates using deduplication logic
      const notificationLocation = `${zoneName}@${violation.location || 'Unknown'}`;

      if (!shouldSendNotification('zone', personName, notificationLocation, 10)) {
        console.log(`Skipping duplicate zone intrusion notification for ${personName} at ${zoneName}`);
        continue;
      }

      const message = formatZoneIntrusionMessage({
        personName,
        zoneName,
        location: violation.location || 'Unknown',
        severity: violation.severity,
        detectionTimestamp: violation.createdAt,
      });

      try {
        // Convert S3 URL to HTTPS if present
        const imageUrl = violation.imageUrl
          ? convertS3UrlToHttps(violation.imageUrl) ?? undefined
          : undefined;

        const result = await sendBulkTelegramNotification({
          userIds: adminUserIds,
          message,
          type: 'zone_intrusion',
          imageUrl,
        });

        notificationResults.push({
          violationId: violation.id,
          personName,
          zoneName,
          sent: result.sent,
          failed: result.failed,
        });

        console.log(`✅ Sent zone intrusion notification for violation ${violation.id} - ${personName} in ${zoneName}`);
      } catch (error) {
        console.error(`Failed to send notification for violation ${violation.id}:`, error);
        notificationResults.push({
          violationId: violation.id,
          personName,
          zoneName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${recentViolations.length} recent zone intrusions`,
      totalViolations: allViolations.length,
      recentViolations: recentViolations.length,
      notifications: notificationResults,
    });
  } catch (error) {
    console.error("Error checking recent zone intrusions:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to check recent zone intrusions",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
