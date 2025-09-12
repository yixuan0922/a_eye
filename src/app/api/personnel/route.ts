import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { S3Service } from "@/lib/s3";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const siteSlug = formData.get("siteSlug") as string;
    const name = formData.get("name") as string;
    const role = formData.get("role") as string;
    
    // Get all photo files from FormData
    const photoFiles: File[] = [];
    const entries = Array.from(formData.entries());
    for (const [key, value] of entries) {
      if (key === "photos" && value instanceof File) {
        photoFiles.push(value);
      }
    }

    if (!siteSlug || !name || !role) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get site by code (not slug)
    const site = await db.site.findUnique({
      where: { code: siteSlug },
    });

    if (!site) {
      return NextResponse.json({ message: "Site not found" }, { status: 404 });
    }

    // Create personnel record first to get ID
    const newPersonnel = await db.personnel.create({
      data: {
        siteId: site.id,
        name,
        role,
        status: "pending",
        isAuthorized: false,
        requestDate: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      },
    });

    // Handle multiple photos upload to S3
    let photoUrls: string[] = [];
    if (photoFiles.length > 0) {
      try {
        // Upload all photos to S3
        photoUrls = await S3Service.uploadMultiplePersonnelPhotos(
          photoFiles,
          newPersonnel.id
        );

        // Update personnel record with photos array
        await db.personnel.update({
          where: { id: newPersonnel.id },
          data: { 
            photos: photoUrls
          } as any, // Type assertion for the entire data object
        });

        console.log(`${photoUrls.length} photos uploaded to S3 for personnel ${newPersonnel.id}`);
      } catch (photoError) {
        console.error("Error uploading photos to S3:", photoError);
        // Don't fail the entire request if photo upload fails
        // Just log the error and continue without photos
      }
    }

    // Return the updated personnel record
    const updatedPersonnel = await db.personnel.findUnique({
      where: { id: newPersonnel.id },
    });

    return NextResponse.json(updatedPersonnel);
  } catch (error) {
    console.error("Failed to create personnel record:", error);
    return NextResponse.json(
      { message: "Failed to create personnel record" },
      { status: 500 }
    );
  }
}
