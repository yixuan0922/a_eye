import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const targetDate = new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all attendance records (not just today's)
    const allAttendance = await db.attendance.findMany({
      select: {
        id: true,
        personnelId: true,
        timestamp: true,
        siteId: true,
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 10,
    });

    // Get today's attendance records
    const todaysAttendance = await db.attendance.findMany({
      where: {
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        id: true,
        personnelId: true,
        timestamp: true,
        siteId: true,
      },
    });

    // Get all authorized personnel
    const authorized = await db.personnel.findMany({
      where: { isAuthorized: true },
      select: {
        id: true,
        name: true,
        isAuthorized: true,
      },
    });

    return NextResponse.json({
      success: true,
      debug: {
        serverTime: targetDate.toISOString(),
        serverTimeLocal: targetDate.toString(),
        queryRange: {
          start: startOfDay.toISOString(),
          end: endOfDay.toISOString(),
        },
        totalAttendanceRecords: allAttendance.length,
        todaysAttendanceRecords: todaysAttendance.length,
        authorizedPersonnelCount: authorized.length,
        recentAttendance: allAttendance.map(a => ({
          ...a,
          timestamp: a.timestamp.toISOString(),
        })),
        todaysAttendance: todaysAttendance.map(a => ({
          ...a,
          timestamp: a.timestamp.toISOString(),
        })),
        authorizedPersonnel: authorized,
      },
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
