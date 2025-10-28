import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const {
      status,
      resolvedBy,
      resolutionNotes,
      identifiedPersonName,
      identifiedPersonnelId,
      severity,
    } = body;

    // Build update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status) updateData.status = status;
    if (resolvedBy) updateData.resolvedBy = resolvedBy;
    if (resolutionNotes) updateData.resolutionNotes = resolutionNotes;
    if (identifiedPersonName) updateData.identifiedPersonName = identifiedPersonName;
    if (identifiedPersonnelId) updateData.identifiedPersonnelId = identifiedPersonnelId;
    if (severity) updateData.severity = severity;

    // If status is being set to resolved, add timestamp
    if (status === "resolved" && !updateData.resolvedAt) {
      updateData.resolvedAt = new Date();
    }

    const updatedAlert = await db.unauthorizedAccess.update({
      where: { id },
      data: updateData,
      include: {
        site: {
          select: {
            id: true,
            name: true,
          },
        },
        camera: {
          select: {
            id: true,
            name: true,
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
    });

    return NextResponse.json({
      success: true,
      message: "Unauthorized access alert updated successfully",
      alert: updatedAlert,
    });
  } catch (error) {
    console.error("Error updating unauthorized access alert:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update unauthorized access alert",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await db.unauthorizedAccess.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Unauthorized access alert deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting unauthorized access alert:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete unauthorized access alert",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
