import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { S3Service } from "@/lib/s3"

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

    // Get personnel to access photos and info
    const personnel = await prisma.personnel.findUnique({
      where: { id },
    })

    if (!personnel) {
      return NextResponse.json(
        { error: "Personnel not found" },
        { status: 404 }
      )
    }

    // Delete face from Flask face recognition API
    try {
      const flaskUrl = process.env.FLASK_API_URL || "https://aeye001.biofuel.osiris.sg"
      const response = await fetch(`${flaskUrl}/api/delete_face`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personnelId: id,
          name: personnel.name,
        }),
      })

      if (response.ok) {
        console.log(`Successfully deleted face from Flask API for personnel ${id}`)
      } else {
        const errorText = await response.text()
        console.error(`Flask API delete_face failed: ${response.status} - ${errorText}`)
      }
    } catch (flaskError) {
      console.error("Error calling Flask API delete_face:", flaskError)
      // Continue with deletion even if Flask API fails
    }

    // Delete all photos from S3
    if (personnel.photos && Array.isArray(personnel.photos) && personnel.photos.length > 0) {
      try {
        const photoUrls = personnel.photos.filter((p): p is string => typeof p === 'string')
        await S3Service.deleteMultipleFiles(photoUrls)
        console.log(`Deleted ${photoUrls.length} photos from S3`)
      } catch (s3Error) {
        console.error("Error deleting photos from S3:", s3Error)
        // Continue with deletion even if S3 deletion fails
      }
    }

    // Delete from database
    await prisma.personnel.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting personnel:", error)
    return NextResponse.json(
      { error: "Failed to delete personnel" },
      { status: 500 }
    )
  }
}
