# A_Eye Telegram Notification Bot

A standalone Express.js server that runs a Telegram bot for sending notifications from the A_Eye surveillance system.

> ⚠️ **IMPORTANT**: This bot must be deployed to a cloud instance (EC2, Render, Railway, etc.) to run 24/7 and receive notifications from your main application.

## Features

- ✅ User authentication via verification codes
- ✅ Send notifications to individual users
- ✅ Send bulk notifications to multiple users
- ✅ User account linking/unlinking
- ✅ Status checking
- ✅ RESTful API for integration
- ✅ Ready for production deployment (EC2, Render, Railway)

## Setup

### 1. Install Dependencies

```bash
cd telegram-bot
npm install
```

### 2. Configure Environment

The `.env` file is already configured with your bot token:

```env
TELEGRAM_BOT_TOKEN=8584793388:AAHbFnSkJbBNEbWUW0t3dYBEQUxsppy8yj0
PORT=3001
```

### 3. Start the Bot

```bash
npm start
```

The server will start on `http://localhost:3001`

## Bot Commands (For Users)

Users interact with the bot via Telegram:

- `/start` - Start the bot and see their Telegram User ID
- `/verify CODE` - Link their account using a verification code from the website
- `/status` - Check their account linking status
- `/unlink` - Unlink their account from the bot
- `/help` - Show help message

## API Endpoints

### 1. Generate Verification Code

**POST** `/api/generate-code`

Generate a verification code for a user to link their Telegram account.

**Request Body:**
```json
{
  "userId": "user123",
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "code": "123456",
  "expiresIn": "10 minutes"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/generate-code \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "email": "admin@changi01",
    "name": "Admin User"
  }'
```

### 2. Get Authenticated Users

**GET** `/api/users`

Get a list of all users linked to Telegram.

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "telegramUserId": "123456789",
      "chatId": "123456789",
      "username": "john_doe",
      "userId": "user123",
      "email": "user@example.com",
      "name": "John Doe",
      "linkedAt": "2025-11-15T07:30:00.000Z"
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3001/api/users
```

### 3. Send Notification to Single User

**POST** `/api/send-notification`

Send a notification to a specific user.

**Request Body:**
```json
{
  "userId": "user123",
  "message": "PPE violation detected at Camera 3!",
  "type": "ppe_violation"
}
```

**Type Options:**
- `violation` - ⚠️ General violation
- `ppe_violation` - 🦺 PPE violation
- `unauthorized` - 🚨 Unauthorized access
- `success` - ✅ Success message
- Default - 📢 General notification

**Response:**
```json
{
  "success": true,
  "message": "Notification sent successfully",
  "sentTo": "user@example.com"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "message": "PPE violation detected at Camera 3!",
    "type": "ppe_violation"
  }'
```

### 4. Send Bulk Notification

**POST** `/api/send-bulk-notification`

Send the same notification to multiple users.

**Request Body:**
```json
{
  "userIds": ["user123", "user456", "user789"],
  "message": "System maintenance scheduled for tonight at 10 PM",
  "type": "violation"
}
```

**Response:**
```json
{
  "success": true,
  "results": {
    "success": [
      { "userId": "user123", "email": "user1@example.com" },
      { "userId": "user456", "email": "user2@example.com" }
    ],
    "failed": [
      { "userId": "user789", "reason": "User not found or not linked" }
    ]
  },
  "sent": 2,
  "failed": 1
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/send-bulk-notification \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user123", "user456"],
    "message": "System maintenance scheduled for tonight",
    "type": "violation"
  }'
```

### 5. Health Check

**GET** `/health`

Check if the bot server is running.

**Response:**
```json
{
  "status": "ok",
  "bot": "running",
  "authenticatedUsers": 5,
  "pendingVerifications": 2
}
```

## User Authentication Flow

1. **User requests to link Telegram on the website**
   - Website calls `/api/generate-code` with user details
   - System generates a 6-digit code (valid for 10 minutes)
   - Code is displayed to the user on the website

2. **User opens Telegram and starts the bot**
   - User sends `/start` to the bot
   - Bot shows instructions and Telegram User ID

3. **User verifies their account**
   - User sends `/verify 123456` (the code from website)
   - Bot links the Telegram account to the user
   - Confirmation message is sent

4. **User starts receiving notifications**
   - Website can now send notifications via `/api/send-notification`
   - User receives real-time Telegram messages

## Integration with A_Eye Website

### Example: Integrate with Next.js App

Create an API route to generate verification codes:

```typescript
// src/app/api/telegram/generate-code/route.ts
export async function POST(request: Request) {
  const { userId, email, name } = await request.json();

  const response = await fetch('http://localhost:3001/api/generate-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, email, name })
  });

  const data = await response.json();
  return Response.json(data);
}
```

### Example: Send PPE Violation Notification

```typescript
// When a PPE violation is detected
async function notifyPPEViolation(violation: PPEViolation, userIds: string[]) {
  const message = `
🦺 PPE Violation Detected

Person: ${violation.personName}
Location: ${violation.location}
Missing: ${violation.ppeMissing.join(', ')}
Severity: ${violation.severity}
Time: ${new Date(violation.detectionTimestamp).toLocaleString()}
  `;

  await fetch('http://localhost:3001/api/send-bulk-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userIds,
      message,
      type: 'ppe_violation'
    })
  });
}
```

## Security Notes

⚠️ **Important:**
- The bot token is hardcoded in `.env` - keep this file secure
- Verification codes expire after 10 minutes
- Users are stored in memory - will be lost on server restart
- For production, consider:
  - Storing linked users in a database
  - Adding rate limiting
  - Implementing proper authentication for API endpoints
  - Using HTTPS for webhook mode instead of polling

## Troubleshooting

### Bot not responding to commands

1. Check if the server is running: `curl http://localhost:3001/health`
2. Verify the bot token is correct in `.env`
3. Check server logs for errors
4. Make sure your bot is not blocked by Telegram

### Notifications not being sent

1. Verify the user is linked: `curl http://localhost:3001/api/users`
2. Check if the `userId` matches the one used during verification
3. Check server logs for error messages

### Port already in use

Change the `PORT` in `.env` to a different port (e.g., 3002, 3003, etc.)

## Development

### Running in Development Mode

```bash
npm run dev
```

### Testing the Bot

1. Start the server
2. Open Telegram and search for your bot
3. Send `/start` to the bot
4. Generate a verification code via API
5. Send `/verify CODE` to link your account
6. Test sending notifications via API

## Production Deployment

This bot **MUST** be deployed to run 24/7 on a cloud instance to receive notifications from your main application.

### Quick Deploy Options:

1. **AWS EC2** (Recommended for production)
   - Full control, always-on
   - Free tier for 12 months
   - See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed steps

2. **Render.com** (Easiest setup)
   - Free tier available (with sleep)
   - Automatic HTTPS
   - Deploy in 5 minutes

3. **Railway.app**
   - $5/month minimum
   - Simple deployment
   - Good performance

📖 **See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions**

After deployment, update your main A_Eye application's `.env`:

```env
# Replace with your deployed bot URL
TELEGRAM_BOT_URL=https://your-bot-url.com
```

Then use the integration examples in `examples/violation-integration.js` to send notifications when violations occur.

## How It Works

1. **Bot runs 24/7** on EC2/Render/Railway
2. **User links account** via `/verify` command in Telegram
3. **Main app detects violation** (PPE, unauthorized access, etc.)
4. **Main app calls bot API** to send notification
5. **User receives Telegram message** instantly

## Example Workflow

```
PPE Violation Detected
        ↓
Main App API Route (/api/ppe-violations)
        ↓
Call Telegram Bot API (POST /api/send-bulk-notification)
        ↓
Bot sends message to linked users
        ↓
Users receive notification in Telegram 📱
```

## Files Overview

- `server.js` - Main bot server with Express.js
- `.env` - Configuration (bot token, port)
- `ecosystem.config.js` - PM2 configuration for EC2
- `examples/violation-integration.js` - Integration code examples
- `DEPLOYMENT.md` - Detailed deployment guide
- `README.md` - This file

## Support

For issues or questions, contact your system administrator.
