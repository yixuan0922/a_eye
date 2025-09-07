import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const streamUrl = searchParams.get("url");

  if (!streamUrl) {
    return new NextResponse("Missing stream URL", { status: 400 });
  }

  try {
    console.log("Proxying stream request to:", streamUrl);

    const response = await fetch(streamUrl, {
      headers: {
        "ngrok-skip-browser-warning": "true",
        "User-Agent": "AI-CCTV-System/1.0",
        Accept: "image/*,*/*",
      },
    });

    if (!response.ok) {
      console.error(
        "Stream proxy error:",
        response.status,
        response.statusText
      );
      return new NextResponse("Stream not available", {
        status: response.status,
      });
    }

    // Get the response headers
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const contentLength = response.headers.get("content-length");

    // Create response headers
    const responseHeaders = new Headers({
      "Content-Type": contentType,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }

    // For MJPEG streams, we want to pass through the stream
    if (contentType.includes("multipart") || streamUrl.includes("video_feed")) {
      responseHeaders.set(
        "Content-Type",
        "multipart/x-mixed-replace; boundary=frame"
      );
    }

    // Return the proxied stream
    return new NextResponse(response.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Stream proxy error:", error);
    return new NextResponse("Stream proxy failed", { status: 500 });
  }
}
