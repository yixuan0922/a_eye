import { NextRequest, NextResponse } from "next/server";
import { S3Service } from "@/lib/s3";

export async function GET() {
  try {
    // Test if S3 credentials are configured
    const testKey = `test/config-test-${Date.now()}.txt`;
    const testContent = Buffer.from("S3 configuration test");

    const url = await S3Service.uploadFile(testContent, testKey, "text/plain");

    // Clean up test file
    await S3Service.deleteFile(testKey);

    return NextResponse.json({
      success: true,
      message: "S3 is configured correctly!",
      testUrl: url,
    });
  } catch (error) {
    console.error("S3 configuration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileKey = `test-uploads/${Date.now()}-${file.name}`;
    const url = await S3Service.uploadFile(buffer, fileKey, file.type);

    return NextResponse.json({
      success: true,
      url,
      key: fileKey,
    });
  } catch (error) {
    console.error("Test upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
