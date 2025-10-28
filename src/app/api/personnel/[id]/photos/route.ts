import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { S3Service } from "@/lib/s3"

const s3Service = new S3Service()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const formData = await request.formData()
    const photos = formData.getAll("photos") as File[]

    if (!photos || photos.length === 0) {
      return NextResponse.json(
        { error: "No photos provided" },
        { status: 400 }
      )
    }

    // Get current personnel to check existing photos
    const personnel = await prisma.personnel.findUnique({
      where: { id },
    })

    if (!personnel) {
      return NextResponse.json(
        { error: "Personnel not found" },
        { status: 404 }
      )
    }

    // Get existing photos array
    const existingPhotos = (personnel.photos as string[]) || []

    // Upload new photos to S3
    const newPhotoUrls = await s3Service.uploadMultiplePersonnelPhotos(
      photos,
      id
    )

    // Combine with existing photos
    const allPhotos = [...existingPhotos, ...newPhotoUrls]

    // Update personnel record with new photos array
    const updatedPersonnel = await prisma.personnel.update({
      where: { id },
      data: {
        photos: allPhotos,
        updatedAt: new Date(),
      },
    })

    // Call Flask API to update face recognition with new photos
    const flaskUrl = process.env.FLASK_API_URL || "http://localhost:5001"
    try {
      const flaskFormData = new FormData()
      flaskFormData.append("person_id", id)
      photos.forEach((photo) => {
        flaskFormData.append("images", photo)
      })

      await fetch(`${flaskUrl}/api/add_faces`, {
        method: "POST",
        body: flaskFormData,
      })
    } catch (flaskError) {
      console.error("Error updating face recognition:", flaskError)
      // Continue even if Flask fails
    }

    return NextResponse.json({
      personnel: updatedPersonnel,
      newPhotos: newPhotoUrls,
    })
  } catch (error) {
    console.error("Error adding photos:", error)
    return NextResponse.json(
      { error: "Failed to add photos" },
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
    const body = await request.json()
    const { photoUrl } = body

    if (!photoUrl) {
      return NextResponse.json(
        { error: "Photo URL is required" },
        { status: 400 }
      )
    }

    // Get current personnel
    const personnel = await prisma.personnel.findUnique({
      where: { id },
    })

    if (!personnel) {
      return NextResponse.json(
        { error: "Personnel not found" },
        { status: 404 }
      )
    }

    // Get existing photos array
    const existingPhotos = (personnel.photos as string[]) || []

    // Remove the photo URL from array
    const updatedPhotos = existingPhotos.filter((url) => url !== photoUrl)

    // Delete from S3
    try {
      await s3Service.deleteMultipleFiles([photoUrl])
    } catch (s3Error) {
      console.error("Error deleting from S3:", s3Error)
      // Continue even if S3 deletion fails
    }

    // Update personnel record
    const updatedPersonnel = await prisma.personnel.update({
      where: { id },
      data: {
        photos: updatedPhotos,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      personnel: updatedPersonnel,
      deletedPhoto: photoUrl,
    })
  } catch (error) {
    console.error("Error deleting photo:", error)
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    )
  }
}
