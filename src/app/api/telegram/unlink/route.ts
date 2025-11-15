import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_BOT_URL = process.env.TELEGRAM_BOT_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get all users from bot to find the Telegram user ID
    const usersResponse = await fetch(`${TELEGRAM_BOT_URL}/api/users`);

    if (!usersResponse.ok) {
      throw new Error('Failed to fetch users from bot');
    }

    const usersData = await usersResponse.json();
    const linkedUser = usersData.users?.find((u: any) => u.userId === userId);

    if (!linkedUser) {
      return NextResponse.json(
        { success: false, error: 'User not linked to Telegram' },
        { status: 404 }
      );
    }

    // Call bot's unlink endpoint (we need to add this to the bot)
    const unlinkResponse = await fetch(`${TELEGRAM_BOT_URL}/api/unlink`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
      })
    });

    if (!unlinkResponse.ok) {
      const errorData = await unlinkResponse.json();
      throw new Error(errorData.error || 'Failed to unlink account');
    }

    return NextResponse.json({
      success: true,
      message: 'Account unlinked successfully'
    });

  } catch (error) {
    console.error('Error unlinking Telegram account:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unlink account'
      },
      { status: 500 }
    );
  }
}
