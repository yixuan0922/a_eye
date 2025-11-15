import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendBulkTelegramNotification, formatPPEViolationMessage } from "@/lib/telegram";
import { convertS3UrlToHttps } from "@/lib/s3";

// Track which violations have already been notified to prevent duplicates
// Store with timestamp to allow re-notification after a certain period
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

    // Get all PPE violations for this site
    const allViolations = await db.pPEViolation.findMany({
      where: {
        siteId,
        status: "active",
      },
      orderBy: {
        detectionTimestamp: "desc",
      },
    });

    const now = new Date();
    const recentViolations = [];

    // Filter violations that are within 10 seconds and haven't been notified yet
    for (const violation of allViolations) {
      const timeDiffSeconds = (now.getTime() - new Date(violation.detectionTimestamp).getTime()) / 1000;

      // Check if violation is recent (within 10 seconds)
      if (timeDiffSeconds <= 10) {
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
        message: "No recent violations to notify",
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
      const message = formatPPEViolationMessage({
        personName: violation.personName,
        location: violation.location || undefined,
        cameraName: violation.cameraName,
        ppeMissing: violation.ppeMissing,
        severity: violation.severity,
        detectionTimestamp: violation.detectionTimestamp,
      });

      try {
        // Convert S3 URL to HTTPS if present
        const imageUrl = violation.snapshotUrl
          ? convertS3UrlToHttps(violation.snapshotUrl)
          : undefined;

        const result = await sendBulkTelegramNotification({
          userIds: adminUserIds,
          message,
          type: 'ppe_violation',
          imageUrl,
        });

        notificationResults.push({
          violationId: violation.id,
          personName: violation.personName,
          sent: result.sent,
          failed: result.failed,
        });

        console.log(`✅ Sent notification for violation ${violation.id} - ${violation.personName}`);
      } catch (error) {
        console.error(`Failed to send notification for violation ${violation.id}:`, error);
        notificationResults.push({
          violationId: violation.id,
          personName: violation.personName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${recentViolations.length} recent violations`,
      totalViolations: allViolations.length,
      recentViolations: recentViolations.length,
      notifications: notificationResults,
    });
  } catch (error) {
    console.error("Error checking recent violations:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to check recent violations",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
