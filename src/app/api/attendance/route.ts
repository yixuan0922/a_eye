import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId, personnelId, confidence, timestamp } = body;

    // Validate required fields
    if (!siteId || !personnelId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields: siteId, personnelId",
        },
        { status: 400 }
      );
    }

    // Validate confidence score
    const confidenceScore =
      confidence !== undefined ? parseFloat(confidence) : 0.0;
    if (isNaN(confidenceScore)) {
      return NextResponse.json(
        {
          success: false,
          message: "Confidence must be a valid number",
        },
        { status: 400 }
      );
    }

    const now = timestamp ? new Date(timestamp) : new Date();

    // Calculate start and end of the day for the given timestamp
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if attendance already exists for this person today
    const existingAttendance = await db.attendance.findFirst({
      where: {
        siteId,
        personnelId,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        timestamp: 'asc', // Get the first (earliest) record of the day
      },
    });

    if (existingAttendance) {
      // Person already has attendance for today, return existing record
      return NextResponse.json({
        success: true,
        attendance: existingAttendance,
        message: "Attendance already recorded for today",
      });
    }

    // Create attendance record
    const attendance = await db.attendance.create({
      data: {
        siteId,
        personnelId,
        confidence: confidenceScore,
        timestamp: now,
      },
    });

    return NextResponse.json({
      success: true,
      attendance,
    });
  } catch (error) {
    console.error("Attendance marking error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to mark attendance",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve attendance records
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId");
    const personnelId = searchParams.get("personnelId");
    const date = searchParams.get("date");
    const limit = parseInt(searchParams.get("limit") || "50");

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

    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      where.timestamp = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const attendanceRecords = await db.attendance.findMany({
      where,
      include: {
        personnel: true,
      },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      count: attendanceRecords.length,
      attendance: attendanceRecords,
    });
  } catch (error) {
    console.error("Attendance retrieval error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve attendance",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
