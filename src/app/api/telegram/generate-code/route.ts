import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_BOT_URL = process.env.TELEGRAM_BOT_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, name } = body;

    if (!userId || !email || !name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: userId, email, name'
        },
        { status: 400 }
      );
    }

    // Call telegram bot to generate verification code
    const response = await fetch(`${TELEGRAM_BOT_URL}/api/generate-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, email, name })
    });

    if (!response.ok) {
      throw new Error('Failed to generate verification code');
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      code: data.code,
      expiresIn: data.expiresIn
    });

  } catch (error) {
    console.error('Error generating Telegram verification code:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate code'
      },
      { status: 500 }
    );
  }
}
