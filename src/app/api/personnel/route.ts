import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { S3Service } from "@/lib/s3";

// Helper function to call Flask add_faces endpoint with multiple files
async function addFacesToFlask(
  personnelId: string,
  name: string,
  photoFiles: File[]
): Promise<{ added: number; failed: number; results: any[]; errors: any[] }> {
  try {
    // Create FormData for multipart upload
    const formData = new FormData();

    // Add each photo file
    photoFiles.forEach((file) => {
      formData.append("files", file);
    });

    // Add person metadata
    formData.append("name", name);
    formData.append("personnelId", personnelId);

    const response = await fetch(
      "https://aeye001.biofuel.osiris.sg/api/add_faces",
      {
        method: "POST",
        body: formData, // No Content-Type header - browser sets it with boundary
      }
    );

    if (!response.ok && response.status !== 207) {
      const errorData = await response.json();
      console.error("Flask add_faces error:", errorData);
      return {
        added: 0,
        failed: photoFiles.length,
        results: [],
        errors: [errorData],
      };
    }

    const result = await response.json();
    console.log(
      `Flask add_faces: ${result.added} added, ${result.failed} failed`
    );
    return result;
  } catch (error) {
    console.error("Error calling Flask add_faces endpoint:", error);
    return {
      added: 0,
      failed: photoFiles.length,
      results: [],
      errors: [{ error: String(error) }],
    };
  }
}

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
            photos: photoUrls,
          } as any, // Type assertion for the entire data object
        });

        console.log(
          `${photoUrls.length} photos uploaded to S3 for personnel ${newPersonnel.id}`
        );

        // Call Flask add_faces endpoint with all photos at once
        const flaskResult = await addFacesToFlask(
          newPersonnel.id,
          name,
          photoFiles
        );

        console.log(
          `Flask face recognition: ${flaskResult.added}/${photoFiles.length} photos successfully added`
        );

        if (flaskResult.errors.length > 0) {
          console.warn("Flask face recognition errors:", flaskResult.errors);
        }
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
