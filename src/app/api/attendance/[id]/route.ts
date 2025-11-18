import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Attendance record ID is required",
        },
        { status: 400 }
      );
    }

    // Check if the record exists
    const existingRecord = await db.attendance.findUnique({
      where: { id },
      include: {
        personnel: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!existingRecord) {
      return NextResponse.json(
        {
          success: false,
          message: "Attendance record not found",
        },
        { status: 404 }
      );
    }

    // Delete the record
    await db.attendance.delete({
      where: { id },
    });

    console.log('[ATTENDANCE DELETE] Deleted record:', {
      id,
      personnelName: existingRecord.personnel.name,
      timestamp: existingRecord.timestamp,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted attendance record for ${existingRecord.personnel.name}`,
      deletedRecord: {
        id: existingRecord.id,
        personnelName: existingRecord.personnel.name,
        timestamp: existingRecord.timestamp,
      },
    });
  } catch (error) {
    console.error("Attendance delete error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete attendance record",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
