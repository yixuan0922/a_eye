import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      personName,
      personnelId,
      confidenceScore,
      siteId,
      cameraId,
      cameraName,
      location,
      previousState,
      currentState,
      ppeWearing,
      ppeMissing,
      ppeRequired,
      violationReason,
      severity,
      detectionTimestamp,
      snapshotUrl,
      snapshotMetadata,
    } = body;

    // Validate required fields
    if (
      !personName ||
      !siteId ||
      !cameraName ||
      !previousState ||
      !currentState ||
      !ppeWearing ||
      !ppeMissing ||
      !ppeRequired ||
      !violationReason
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing required fields: personName, siteId, cameraName, previousState, currentState, ppeWearing, ppeMissing, ppeRequired, violationReason",
        },
        { status: 400 }
      );
    }

    // Validate arrays
    if (
      !Array.isArray(ppeWearing) ||
      !Array.isArray(ppeMissing) ||
      !Array.isArray(ppeRequired)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "ppeWearing, ppeMissing, and ppeRequired must be arrays",
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

    // Determine severity based on missing PPE if not provided
    let violationSeverity = severity || "medium";
    if (!severity) {
      if (ppeMissing.length === 0) {
        violationSeverity = "low"; // Compliance restored
      } else if (ppeMissing.includes("Hard_hat")) {
        violationSeverity = "high"; // Hard hat is critical
      } else if (ppeMissing.length >= 2) {
        violationSeverity = "high"; // Multiple items missing
      } else {
        violationSeverity = "medium";
      }
    }

    // Try to find matching personnel by name if not provided
    let resolvedPersonnelId = personnelId;
    if (!resolvedPersonnelId && personName) {
      const personnel = await db.personnel.findFirst({
        where: {
          name: personName,
          siteId: siteId,
        },
      });
      if (personnel) {
        resolvedPersonnelId = personnel.id;
      }
    }

    // Create PPE violation record
    const ppeViolation = await db.pPEViolation.create({
      data: {
        personName,
        personnelId: resolvedPersonnelId,
        confidenceScore: confidenceScore || null,
        siteId,
        cameraId: cameraId || null,
        cameraName,
        location: location || null,
        previousState,
        currentState,
        ppeWearing,
        ppeMissing,
        ppeRequired,
        violationReason,
        severity: violationSeverity,
        status: "active",
        detectionTimestamp: timestamp,
        snapshotUrl: snapshotUrl || null,
        snapshotMetadata: snapshotMetadata || null,
      },
    });

    return NextResponse.json({
      success: true,
      violation: ppeViolation,
    });
  } catch (error) {
    console.error("PPE violation creation error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create PPE violation",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve PPE violations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId");
    const personnelId = searchParams.get("personnelId");
    const personName = searchParams.get("personName");
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
    const where: any = { siteId };

    if (personnelId) {
      where.personnelId = personnelId;
    }

    if (personName) {
      where.personName = {
        contains: personName,
        mode: "insensitive",
      };
    }

    if (status) {
      where.status = status;
    }

    if (severity) {
      where.severity = severity;
    }

    if (startDate || endDate) {
      where.detectionTimestamp = {};
      if (startDate) {
        where.detectionTimestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.detectionTimestamp.lte = new Date(endDate);
      }
    }

    const violations = await db.pPEViolation.findMany({
      where,
      include: {
        site: true,
        camera: true,
        personnel: true,
      },
      orderBy: { detectionTimestamp: "desc" },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      count: violations.length,
      violations,
    });
  } catch (error) {
    console.error("PPE violation retrieval error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve PPE violations",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
