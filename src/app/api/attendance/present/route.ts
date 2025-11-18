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

    console.log('[ATTENDANCE DEBUG] Present endpoint');
    console.log('Server time:', targetDate.toISOString());
    console.log('Query range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());

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
        timestamp: true,
      },
    });

    console.log('Found attendance records:', todaysAttendance.length);
    if (todaysAttendance.length > 0) {
      console.log('Sample record timestamps:', todaysAttendance.slice(0, 3).map(a => ({
        personnelId: a.personnelId,
        timestamp: a.timestamp.toISOString()
      })));
    }

    // Present = authorized ∩ attended
    const presentIdSet = new Set(
      todaysAttendance
        .map((a) => a.personnelId)
        .filter((id) => authorizedSet.has(id))
    );

    const present = authorized.filter((p) => presentIdSet.has(p.id));

    return NextResponse.json({
      success: true,
      count: present.length,
      present,
    });
  } catch (error) {
    console.error("Attendance present error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve present personnel",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
