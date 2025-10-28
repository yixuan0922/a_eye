import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      trackId,
      siteId,
      cameraId,
      cameraName,
      location,
      detectionTimestamp,
      durationSeconds,
      totalFramesTracked,
      faceDetectionAttempts,
      snapshotUrl,
      bbox,
      status = "active",
      severity = "high",
    } = body;

    // Validate required fields
    if (trackId === undefined || trackId === null) {
      return NextResponse.json(
        {
          success: false,
          message: "trackId is required",
        },
        { status: 400 }
      );
    }

    if (!siteId) {
      return NextResponse.json(
        {
          success: false,
          message: "siteId is required",
        },
        { status: 400 }
      );
    }

    if (!cameraName || !location) {
      return NextResponse.json(
        {
          success: false,
          message: "cameraName and location are required",
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

    // Verify site exists
    const site = await db.site.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      return NextResponse.json(
        {
          success: false,
          message: "Site not found",
        },
        { status: 404 }
      );
    }

    // Create unauthorized access record
    const unauthorizedAccess = await db.unauthorizedAccess.create({
      data: {
        trackId,
        siteId,
        cameraId: cameraId || null,
        cameraName,
        location,
        detectionTimestamp: timestamp,
        durationSeconds: durationSeconds || 0,
        totalFramesTracked: totalFramesTracked || 0,
        faceDetectionAttempts: faceDetectionAttempts || 0,
        snapshotUrl: snapshotUrl || null,
        bbox: bbox || null,
        status,
        severity,
      },
    });

    console.log(
      `✅ Unauthorized access alert created: Track-${trackId} at ${cameraName}`
    );

    return NextResponse.json(
      {
        success: true,
        message: "Unauthorized access alert created successfully",
        alert: {
          id: unauthorizedAccess.id,
          trackId: unauthorizedAccess.trackId,
          location: unauthorizedAccess.location,
          timestamp: unauthorizedAccess.detectionTimestamp,
          severity: unauthorizedAccess.severity,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unauthorized access creation error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create unauthorized access alert",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Query parameters
    const siteId = searchParams.get("siteId");
    const cameraId = searchParams.get("cameraId");
    const status = searchParams.get("status") || "active";
    const severity = searchParams.get("severity");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = parseInt(searchParams.get("skip") || "0");

    // Build where clause
    const where: any = {};

    if (siteId) where.siteId = siteId;
    if (cameraId) where.cameraId = cameraId;
    if (status !== "all") where.status = status;
    if (severity) where.severity = severity;

    if (startDate || endDate) {
      where.detectionTimestamp = {};
      if (startDate) {
        where.detectionTimestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.detectionTimestamp.lte = new Date(endDate);
      }
    }

    // Fetch unauthorized access records
    const [alerts, total] = await Promise.all([
      db.unauthorizedAccess.findMany({
        where,
        orderBy: { detectionTimestamp: "desc" },
        take: limit,
        skip,
        include: {
          site: {
            select: {
              id: true,
              name: true,
              location: true,
            },
          },
          camera: {
            select: {
              id: true,
              name: true,
              location: true,
            },
          },
          identifiedPersonnel: {
            select: {
              id: true,
              name: true,
              employeeId: true,
            },
          },
        },
      }),
      db.unauthorizedAccess.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      alerts,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching unauthorized access alerts:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch unauthorized access alerts",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
