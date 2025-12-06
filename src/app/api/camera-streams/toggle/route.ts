import { NextRequest, NextResponse } from "next/server";

const STREAM_SERVER_URL = "https://aeye001.biofuel.osiris.sg";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${STREAM_SERVER_URL}/api/cameras/toggle_all_streams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error proxying toggle streams request:', error);
    return NextResponse.json(
      { error: 'Failed to toggle camera streams' },
      { status: 500 }
    );
  }
}
