import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Compute today's window (no site filter, global across all sites)
    const targetDate = new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch all authorized personnel
    const authorized = await db.personnel.findMany({
      where: { isAuthorized: true },
      select: {
        id: true,
        name: true,
        role: true,
        position: true,
        photos: true,
        siteId: true,
      },
    });
    const authorizedSet = new Set(authorized.map((p) => p.id));

    // Fetch attendance for the day
    const todaysAttendance = await db.attendance.findMany({
      where: {
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        personnelId: true,
        siteId: true,
      },
    });

    const presentIdSet = new Set(
      todaysAttendance
        .map((a) => a.personnelId)
        .filter((id) => authorizedSet.has(id))
    );

    // Absent = authorized \ attended
    const absent = authorized.filter((p) => !presentIdSet.has(p.id));

    return NextResponse.json({
      success: true,
      count: absent.length,
      absent,
    });
  } catch (error) {
    console.error("Attendance absent error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve absent personnel",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


