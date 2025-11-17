import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendBulkTelegramNotification, formatZoneIntrusionMessage } from "@/lib/telegram";
import { convertS3UrlToHttps } from "@/lib/s3";
import { isWithinRecentTime } from "@/lib/time-utils";
import { shouldSendNotification } from "@/lib/notification-dedup";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      personName,
      zoneName,
      zoneId,
      siteId,
      cameraId,
      cameraName,
      location,
      type,
      description,
      severity,
      status,
      detectionTimestamp,
      snapshotUrl,
      personBbox,
      snapshotMetadata,
    } = body;

    // Validate required fields
    if (!personName || !zoneName || !siteId || !cameraName) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields: personName, zoneName, siteId, cameraName",
        },
        { status: 400 }
      );
    }

    // Parse detection timestamp
    const timestamp = detectionTimestamp
      ? new Date(detectionTimestamp)
      : new Date();

    if (isNaN(timestamp.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid detectionTimestamp format",
        },
        { status: 400 }
      );
    }

    // Determine severity if not provided (default to high for Unknown personnel)
    const violationSeverity = severity || (personName.includes("Unknown") ? "high" : "medium");

    // Try to find matching personnel by name
    let resolvedPersonnelId = null;
    if (personName && !personName.includes("Unknown")) {
      // Remove tracking ID suffix if present (e.g., "Unknown#0" -> "Unknown")
      const cleanName = personName.replace(/#\d+$/, '');

      const personnel = await db.personnel.findFirst({
        where: {
          name: cleanName,
          siteId: siteId,
        },
      });
      if (personnel) {
        resolvedPersonnelId = personnel.id;
      }
    }

    // Create zone intrusion violation record using generic Violation model
    const violation = await db.violation.create({
      data: {
        type: type || "restricted_zone",
        description: description || `${personName} detected in ${zoneName}`,
        severity: violationSeverity,
        status: status || "active",
        location: location || null,
        siteId,
        cameraId: cameraId || null,
        personnelId: resolvedPersonnelId,
        imageUrl: snapshotUrl || null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    });

    // Send Telegram notification only if detection is within 1 minute of current SG time
    // Check if the createdAt field is within 60 seconds before/after current Singapore time
    if (isWithinRecentTime(violation.createdAt, 60)) {
      // Check for duplicate notifications (same person + zone within 10 seconds)
      const notificationLocation = `${zoneName}@${location || cameraName}`;

      if (shouldSendNotification('zone', personName, notificationLocation, 10)) {
        let adminUserIds: string[] = [];

        try {
          const TELEGRAM_BOT_URL = process.env.TELEGRAM_BOT_URL || 'http://localhost:3001';
          const usersResponse = await fetch(`${TELEGRAM_BOT_URL}/api/users`);

          if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            // Get all user IDs who have linked their Telegram accounts
            adminUserIds = usersData.users?.map((u: any) => u.userId) || [];
            console.log(`📱 Found ${adminUserIds.length} users with linked Telegram accounts`);
          }
        } catch (error) {
          console.error('Failed to fetch linked Telegram users:', error);
        }

        if (adminUserIds.length > 0) {
          // Format message for zone intrusion
          const message = formatZoneIntrusionMessage({
            personName,
            zoneName,
            location: location || cameraName,
            severity: violationSeverity,
            detectionTimestamp: timestamp,
          });

          // Send notification without blocking the response
          // Convert S3 URL to HTTPS if present
          const imageUrl = snapshotUrl
            ? convertS3UrlToHttps(snapshotUrl) ?? undefined
            : undefined;

          sendBulkTelegramNotification({
            userIds: adminUserIds,
            message,
            type: 'zone_intrusion',
            imageUrl
          }).catch(error => {
            console.error('Failed to send Telegram notification:', error);
            // Don't fail the request if notification fails
          });
        }
      }
    } else {
      console.log(`⏭️  Skipping zone intrusion notification - detection timestamp outside 60-second window`);
    }

    return NextResponse.json({
      success: true,
      violation,
    });
  } catch (error) {
    console.error("Zone intrusion creation error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create zone intrusion violation",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve zone intrusions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId");
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "100");

    if (!siteId) {
      return NextResponse.json(
        {
          success: false,
          message: "siteId is required",
        },
        { status: 400 }
      );
    }

    // Build query filters
    const where: any = {
      siteId,
      type: "restricted_zone"
    };

    if (status) {
      where.status = status;
    }

    if (severity) {
      where.severity = severity;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const violations = await db.violation.findMany({
      where,
      include: {
        site: true,
        camera: true,
        personnel: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      count: violations.length,
      violations,
    });
  } catch (error) {
    console.error("Zone intrusion retrieval error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve zone intrusions",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
