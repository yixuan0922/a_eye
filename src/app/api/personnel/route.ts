import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { S3Service } from "@/lib/s3";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const siteSlug = formData.get("siteSlug") as string;
    const name = formData.get("name") as string;
    const role = formData.get("role") as string;
    const photoFile = formData.get("photo") as File | null;

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

    // Handle photo upload to S3
    let photoUrl = null;
    if (photoFile) {
      try {
        // Convert file to buffer
        const bytes = await photoFile.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate unique key for S3
        const fileKey = S3Service.generatePersonnelPhotoKey(
          newPersonnel.id,
          photoFile.name
        );

        // Upload to S3
        photoUrl = await S3Service.uploadFile(buffer, fileKey, photoFile.type);

        // Update personnel record with photo URL
        await db.personnel.update({
          where: { id: newPersonnel.id },
          data: { photo: photoUrl },
        });

        console.log(`Photo uploaded to S3: ${photoUrl}`);
      } catch (photoError) {
        console.error("Error uploading photo to S3:", photoError);
        // Don't fail the entire request if photo upload fails
        // Just log the error and continue without photo
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
