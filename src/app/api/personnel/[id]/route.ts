import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    const { name, role, position, department, accessLevel } = body

    // Update personnel record
    const updatedPersonnel = await prisma.personnel.update({
      where: { id },
      data: {
        name,
        role,
        position,
        department,
        accessLevel,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(updatedPersonnel)
  } catch (error) {
    console.error("Error updating personnel:", error)
    return NextResponse.json(
      { error: "Failed to update personnel" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Get personnel to access photos
    const personnel = await prisma.personnel.findUnique({
      where: { id },
    })

    if (!personnel) {
      return NextResponse.json(
        { error: "Personnel not found" },
        { status: 404 }
      )
    }

    // Delete from database
    await prisma.personnel.delete({
      where: { id },
    })

    // Note: S3 photo deletion is handled by the deletePersonnel function in storage.ts
    // which is called from tRPC, but we can also add it here for REST API consistency

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting personnel:", error)
    return NextResponse.json(
      { error: "Failed to delete personnel" },
      { status: 500 }
    )
  }
}
