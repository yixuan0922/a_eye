import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_BOT_URL = process.env.TELEGRAM_BOT_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get all authenticated users from bot
    const response = await fetch(`${TELEGRAM_BOT_URL}/api/users`);

    if (!response.ok) {
      throw new Error('Failed to fetch users from bot');
    }

    const data = await response.json();

    // Check if user is linked
    const linkedUser = data.users?.find((u: any) => u.userId === userId);

    return NextResponse.json({
      success: true,
      isLinked: !!linkedUser,
      linkedAt: linkedUser?.linkedAt,
      username: linkedUser?.username
    });

  } catch (error) {
    console.error('Error checking Telegram status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check status'
      },
      { status: 500 }
    );
  }
}
