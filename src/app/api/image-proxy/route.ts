import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Missing url parameter" },
        { status: 400 }
      );
    }

    // Validate that the URL is from your S3 bucket for security
    const bucketName = process.env.AWS_S3_BUCKET_NAME!;
    const expectedDomain = `${bucketName}.s3.ap-southeast-1.amazonaws.com`;

    if (!imageUrl.includes(expectedDomain)) {
      return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
    }

    console.log("🔄 Proxying image request:", imageUrl);

    // Fetch the image from S3
    const response = await fetch(imageUrl);

    if (!response.ok) {
      console.error(
        "❌ Failed to fetch image from S3:",
        response.status,
        response.statusText
      );
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: response.status }
      );
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    console.log("✅ Successfully proxied image:", {
      url: imageUrl,
      contentType,
      size: imageBuffer.byteLength,
    });

    // Return the image with proper CORS headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "*",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("❌ Image proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
