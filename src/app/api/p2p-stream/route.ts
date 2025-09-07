import { NextRequest, NextResponse } from "next/server";
import { createDahuaP2PClient } from "@/lib/dahua-p2p";

// Store active P2P connections (in production, use Redis or similar)
const activeConnections = new Map<string, any>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("connectionId");
  const channel = searchParams.get("channel");
  const subtype = searchParams.get("subtype");

  if (!connectionId || !channel) {
    return new NextResponse("Missing required parameters", { status: 400 });
  }

  try {
    // Get the active P2P connection
    const p2pClient = activeConnections.get(connectionId);

    if (!p2pClient || !p2pClient.isConnectionActive()) {
      return new NextResponse("P2P connection not found or inactive", {
        status: 404,
      });
    }

    // In a real implementation, this would:
    // 1. Use the P2P connection to fetch the stream
    // 2. Convert it to HTTP-compatible format
    // 3. Stream it back to the client

    // For now, we'll return a placeholder response
    const streamData = await fetchP2PStream(
      connectionId,
      parseInt(channel),
      parseInt(subtype || "1")
    );

    return new NextResponse(streamData, {
      status: 200,
      headers: {
        "Content-Type": "multipart/x-mixed-replace; boundary=frame",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("P2P stream error:", error);
    return new NextResponse("P2P stream failed", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serialNumber, username, password } = body;

    if (!serialNumber || !username || !password) {
      return new NextResponse("Missing device credentials", { status: 400 });
    }

    // Create P2P client
    const p2pClient = createDahuaP2PClient({
      serialNumber,
      username,
      password,
    });

    // Establish P2P connection
    const connected = await p2pClient.connect();

    if (!connected) {
      return new NextResponse("Failed to establish P2P connection", {
        status: 500,
      });
    }

    // Store the connection for later use
    const connectionId = `p2p_${serialNumber}_${Date.now()}`;
    activeConnections.set(connectionId, p2pClient);

    // Get available streams
    const streams = await p2pClient.getStreamUrls();

    return NextResponse.json({
      success: true,
      connectionId,
      streams,
      message: "P2P connection established successfully",
    });
  } catch (error) {
    console.error("P2P connection error:", error);
    return new NextResponse("P2P connection failed", { status: 500 });
  }
}

// Helper function to fetch P2P stream (placeholder)
async function fetchP2PStream(
  connectionId: string,
  channel: number,
  subtype: number
): Promise<ReadableStream> {
  // This is where the actual P2P stream fetching would happen
  // Using Dahua's P2P SDK to get the video stream

  // For now, return a mock stream
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      // Mock MJPEG stream
      const mockFrame = encoder.encode(
        "--frame\r\n" +
          "Content-Type: image/jpeg\r\n\r\n" +
          "Mock P2P Stream Data for Channel " +
          channel +
          "\r\n"
      );

      controller.enqueue(mockFrame);
      controller.close();
    },
  });
}






