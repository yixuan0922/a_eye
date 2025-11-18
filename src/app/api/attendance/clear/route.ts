import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(request: NextRequest) {
  try {
    // Optional: Add authentication/authorization check here
    // to ensure only admins can clear attendance

    // Get query parameters for optional filtering
    const searchParams = request.nextUrl.searchParams;
    const personnelId = searchParams.get('personnelId');
    const siteId = searchParams.get('siteId');
    const date = searchParams.get('date'); // Format: YYYY-MM-DD

    let whereClause: any = {};

    // Build where clause based on query parameters
    if (personnelId) {
      whereClause.personnelId = personnelId;
    }

    if (siteId) {
      whereClause.siteId = siteId;
    }

    if (date) {
      // Parse the date and create start/end of day
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      whereClause.timestamp = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    // Delete attendance records based on filters
    const result = await db.attendance.deleteMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
    });

    console.log('[ATTENDANCE CLEAR] Deleted attendance records:', result.count);
    console.log('[ATTENDANCE CLEAR] Filters applied:', whereClause);

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      filters: whereClause,
      message: `Successfully deleted ${result.count} attendance record(s)`,
    });
  } catch (error) {
    console.error("Attendance clear error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to clear attendance records",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to preview what would be deleted
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const personnelId = searchParams.get('personnelId');
    const siteId = searchParams.get('siteId');
    const date = searchParams.get('date');

    let whereClause: any = {};

    if (personnelId) {
      whereClause.personnelId = personnelId;
    }

    if (siteId) {
      whereClause.siteId = siteId;
    }

    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      whereClause.timestamp = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const records = await db.attendance.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        personnel: {
          select: {
            name: true,
          },
        },
        site: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      count: records.length,
      records: records.map(r => ({
        id: r.id,
        personnelName: r.personnel.name,
        siteName: r.site.name,
        timestamp: r.timestamp.toISOString(),
      })),
      filters: whereClause,
    });
  } catch (error) {
    console.error("Attendance preview error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to preview attendance records",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
