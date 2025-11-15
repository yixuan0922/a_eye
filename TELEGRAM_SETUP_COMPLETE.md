# ✅ Telegram Bot Setup - COMPLETE!

I've set everything up for you! Here's what's been done and what you need to do next.

## 🎉 What's Been Completed

### 1. ✅ Bot Server Created
- Location: `/telegram-bot/`
- Express.js server running on port 3001
- Currently running locally and working!

### 2. ✅ Main App Integration
- Added Telegram notification helper: `src/lib/telegram.ts`
- Integrated with PPE violation route: `src/app/api/ppe-violations/route.ts`
- Integrated with unauthorized access route: `src/app/api/unauthorized-access/route.ts`
- Environment variable added: `TELEGRAM_BOT_URL=http://localhost:3001`

### 3. ✅ Bot is Live
The bot server is currently running and ready to receive API calls!

---

## 🚀 Next Steps (What YOU Need to Do)

### Step 1: Link Your Telegram Account (5 minutes)

1. **Open Telegram** on your phone
2. **Search for your bot** (the one you created with @BotFather)
3. **Send `/start`** to the bot
4. **Generate a verification code**:

```bash
curl -X POST http://localhost:3001/api/generate-code \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "email": "your@email.com",
    "name": "Your Name"
  }'
```

Replace:
- `YOUR_USER_ID` - Use your actual user ID from the database (find it in your User table)
- `your@email.com` - Your email
- `Your Name` - Your name

5. **Copy the code** from the response (6 digits)
6. **In Telegram, send**: `/verify 123456` (use your actual code)
7. **Done!** You should get a confirmation message

### Step 2: Add Your User ID to Violation Routes (IMPORTANT!)

Right now, the routes won't send notifications because the `adminUserIds` array is empty.

**Edit these files and add your user ID:**

#### File 1: `src/app/api/ppe-violations/route.ts` (Line 135)

Find this line:
```typescript
const adminUserIds: string[] = []; // Add your user IDs here
```

Change it to:
```typescript
const adminUserIds: string[] = ['YOUR_USER_ID']; // Replace with your actual user ID
```

#### File 2: `src/app/api/unauthorized-access/route.ts` (Line 110)

Find this line:
```typescript
const adminUserIds: string[] = []; // Add your user IDs here
```

Change it to:
```typescript
const adminUserIds: string[] = ['YOUR_USER_ID']; // Replace with your actual user ID
```

**How to find your user ID:**
- It's the `id` field in your `User` table in the database
- It looks like: `clxxx123abc...` (a long string)

### Step 3: Test the Integration

Once you've:
1. ✅ Linked your Telegram account (Step 1)
2. ✅ Added your user ID to the routes (Step 2)

Test it by creating a violation:

```bash
# Test PPE Violation
curl -X POST http://localhost:3000/api/ppe-violations \
  -H "Content-Type: application/json" \
  -d '{
    "personName": "Test Person",
    "siteId": "YOUR_SITE_ID",
    "cameraName": "Test Camera",
    "location": "Zone A",
    "previousState": "compliant",
    "currentState": "non_compliant",
    "ppeWearing": ["Vest"],
    "ppeMissing": ["Hard_hat", "Gloves"],
    "ppeRequired": ["Hard_hat", "Vest", "Gloves"],
    "violationReason": "Missing hard hat and gloves",
    "severity": "high",
    "detectionTimestamp": "2025-11-15T15:30:00Z"
  }'
```

**You should receive a Telegram message instantly!** 🎉

---

## 📱 Bot Commands Reference

Users can interact with the bot:

- `/start` - Start bot and see Telegram ID
- `/verify CODE` - Link account with verification code
- `/status` - Check if your account is linked
- `/unlink` - Disconnect your account
- `/help` - Show help message

---

## 🌐 Deploying to Production (EC2)

When ready to deploy to EC2:

### Quick Deploy Steps:

1. **SSH into your EC2 instance**
```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

2. **Install Node.js and PM2**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

3. **Upload the telegram-bot folder**
```bash
# From your local machine:
scp -i your-key.pem -r telegram-bot ubuntu@YOUR_EC2_IP:/home/ubuntu/
```

4. **On EC2, start the bot**
```bash
cd /home/ubuntu/telegram-bot
npm install --production
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

5. **Update your main app's .env**
```env
TELEGRAM_BOT_URL=http://YOUR_EC2_IP:3001
# Or if using domain:
TELEGRAM_BOT_URL=https://your-domain.com
```

6. **Open port 3001 in EC2 security group**
- Go to EC2 → Security Groups
- Add inbound rule: Custom TCP, Port 3001, Source: Anywhere (or your server's IP)

### Full deployment guide:
See `telegram-bot/DEPLOYMENT.md` for complete instructions.

---

## 🔧 Current Configuration

### Bot Server (telegram-bot/)
- **Status**: ✅ Running locally
- **URL**: http://localhost:3001
- **Port**: 3001
- **Token**: Configured in `telegram-bot/.env`

### Main App
- **Environment**: Development
- **Bot URL**: `TELEGRAM_BOT_URL=http://localhost:3001`
- **Integrated Routes**:
  - ✅ PPE Violations
  - ✅ Unauthorized Access

### Files Modified/Created

**Created:**
- `telegram-bot/` - Complete bot server
- `src/lib/telegram.ts` - Notification helper

**Modified:**
- `src/app/api/ppe-violations/route.ts` - Added notifications
- `src/app/api/unauthorized-access/route.ts` - Added notifications
- `.env` - Added `TELEGRAM_BOT_URL`

---

## 📊 How It Works

```
1. Violation Detected
   ↓
2. API Route Creates Record in Database
   ↓
3. API Route Calls telegram.ts Helper
   ↓
4. Helper Sends POST to Bot Server (localhost:3001)
   ↓
5. Bot Server Sends Message via Telegram API
   ↓
6. You Receive Notification on Your Phone 📱
```

---

## 🐛 Troubleshooting

### Bot not sending notifications?

**Check 1: Is the bot server running?**
```bash
curl http://localhost:3001/health
```
Should return: `{"status":"ok","bot":"running",...}`

**Check 2: Is your account linked?**
```bash
curl http://localhost:3001/api/users
```
Your account should be in the list.

**Check 3: Did you add your user ID to the routes?**
Check `src/app/api/ppe-violations/route.ts` line 135 - should have your user ID in the array.

**Check 4: Are there any errors?**
Check the bot server logs in the terminal where it's running.

### How to restart the bot server?

If running locally, just stop (Ctrl+C) and restart:
```bash
cd telegram-bot
npm start
```

If running on EC2 with PM2:
```bash
pm2 restart telegram-bot
pm2 logs telegram-bot  # View logs
```

---

## ✨ Quick Reference

### Test Bot Health
```bash
curl http://localhost:3001/health
```

### Generate Verification Code
```bash
curl -X POST http://localhost:3001/api/generate-code \
  -H "Content-Type: application/json" \
  -d '{"userId":"user123","email":"test@test.com","name":"Test"}'
```

### List Linked Users
```bash
curl http://localhost:3001/api/users
```

### Send Test Notification
```bash
curl -X POST http://localhost:3001/api/send-notification \
  -H "Content-Type: application/json" \
  -d '{"userId":"YOUR_USER_ID","message":"Test!","type":"success"}'
```

---

## 📚 Documentation

All documentation is in the `telegram-bot/` folder:

- `README.md` - Full API documentation
- `QUICKSTART.md` - 5-minute setup guide
- `DEPLOYMENT.md` - EC2/Render/Railway deployment
- `PROJECT_SUMMARY.md` - Architecture overview
- `examples/violation-integration.js` - More integration examples

---

## 🎯 Summary Checklist

Complete these to finish setup:

- [ ] Link your Telegram account (Step 1 above)
- [ ] Add your user ID to violation routes (Step 2 above)
- [ ] Test by creating a violation (Step 3 above)
- [ ] Receive your first Telegram notification! 🎉
- [ ] When ready, deploy to EC2 (see DEPLOYMENT.md)
- [ ] Update production .env with EC2 bot URL

---

## 💡 Tips

1. **Keep bot server running** - Use PM2 on EC2 for 24/7 operation
2. **Add multiple users** - Just add more user IDs to the `adminUserIds` arrays
3. **Customize messages** - Edit the `format*Message` functions in `src/lib/telegram.ts`
4. **Monitor** - Check bot logs regularly for any issues

---

## 🆘 Need Help?

Everything is documented in `telegram-bot/`:
- Start with `QUICKSTART.md`
- For deployment, see `DEPLOYMENT.md`
- For API details, see `README.md`

---

**You're almost done! Just complete Steps 1-3 above and you'll be receiving Telegram notifications! 🚀**
