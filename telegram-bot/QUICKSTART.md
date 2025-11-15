# Quick Start Guide

Get the Telegram bot running in 5 minutes!

## Local Testing (Development)

### 1. Start the Bot

```bash
cd telegram-bot
npm start
```

You should see:
```
✅ Telegram Bot Server running on port 3001
✅ Bot is polling for messages
✅ API endpoints available at http://localhost:3001
```

### 2. Test in Telegram

1. Open Telegram on your phone
2. Search for your bot by name (the one you created with @BotFather)
3. Send: `/start`
4. Bot should reply with welcome message

### 3. Link Your Account

**Generate verification code:**
```bash
curl -X POST http://localhost:3001/api/generate-code \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test123",
    "email": "test@example.com",
    "name": "Test User"
  }'
```

Response:
```json
{
  "success": true,
  "code": "123456",
  "expiresIn": "10 minutes"
}
```

**In Telegram, send:**
```
/verify 123456
```

Bot should reply: "✅ Account linked successfully!"

### 4. Send Test Notification

```bash
curl -X POST http://localhost:3001/api/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test123",
    "message": "Test notification from A_Eye system!",
    "type": "success"
  }'
```

You should receive the message in Telegram! 🎉

### 5. Check Health

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "bot": "running",
  "authenticatedUsers": 1,
  "pendingVerifications": 0
}
```

## Deploy to Production (Render - Fastest)

### 1. Create GitHub Repo

```bash
cd telegram-bot
git init
git add .
git commit -m "Initial commit"
git branch -M main

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/telegram-bot.git
git push -u origin main
```

### 2. Deploy to Render

1. Go to [https://render.com](https://render.com)
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Select your `telegram-bot` repo
5. Configure:
   - **Name**: `telegram-bot`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Add environment variables:
   - `TELEGRAM_BOT_TOKEN` = `8584793388:AAHbFnSkJbBNEbWUW0t3dYBEQUxsppy8yj0`
   - `PORT` = `3001`
7. Click "Create Web Service"

Wait 2-3 minutes for deployment.

### 3. Get Your Bot URL

Render will give you a URL like:
```
https://telegram-bot-xxxx.onrender.com
```

### 4. Test Production Bot

```bash
# Replace with your actual Render URL
curl https://telegram-bot-xxxx.onrender.com/health
```

### 5. Update Main App

In your main A_Eye application, add to `.env`:

```env
TELEGRAM_BOT_URL=https://telegram-bot-xxxx.onrender.com
```

### 6. Test From Main App

In your violation API routes, add:

```typescript
// Example: When PPE violation is created
const TELEGRAM_BOT_URL = process.env.TELEGRAM_BOT_URL;

await fetch(`${TELEGRAM_BOT_URL}/api/send-notification`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'test123',
    message: `🦺 PPE Violation: ${violation.personName} missing ${violation.ppeMissing}`,
    type: 'ppe_violation'
  })
});
```

## Common Commands

### Test Locally
```bash
npm start
```

### Check Status
```bash
curl http://localhost:3001/health
```

### Generate Code
```bash
curl -X POST http://localhost:3001/api/generate-code \
  -H "Content-Type: application/json" \
  -d '{"userId":"user1","email":"user@test.com","name":"User One"}'
```

### List Linked Users
```bash
curl http://localhost:3001/api/users
```

### Send Notification
```bash
curl -X POST http://localhost:3001/api/send-notification \
  -H "Content-Type: application/json" \
  -d '{"userId":"user1","message":"Test!","type":"success"}'
```

## Bot Commands (In Telegram)

- `/start` - Start bot
- `/verify 123456` - Link account with code
- `/status` - Check if linked
- `/unlink` - Unlink account
- `/help` - Show help

## Notification Types

```javascript
type: 'ppe_violation'   // 🦺 PPE Violation
type: 'unauthorized'    // 🚨 Unauthorized Access
type: 'violation'       // ⚠️ General Violation
type: 'success'         // ✅ Success
// default               // 📢 General
```

## Troubleshooting

### Bot not responding
- Check if server is running
- Verify bot token in `.env`
- Make sure you're using the correct bot

### Can't send notifications
- User must be linked first (`/verify`)
- Check `userId` matches
- Check server logs

### "User not found"
- Run: `curl http://localhost:3001/api/users`
- Verify user is in the list
- Re-verify if needed

## Next Steps

1. ✅ Local testing working? → Deploy to production
2. ✅ Production deployed? → Update main app `.env`
3. ✅ Main app updated? → Integrate with violation routes
4. ✅ Everything working? → Set up monitoring

## Need More Help?

- **Integration Examples**: See `examples/violation-integration.js`
- **Deployment Guide**: See `DEPLOYMENT.md`
- **Full Documentation**: See `README.md`
