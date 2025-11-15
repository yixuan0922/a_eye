const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Telegram Bot Configuration
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8584793388:AAHbFnSkJbBNEbWUW0t3dYBEQUxsppy8yj0';
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// In-memory storage for authenticated users (replace with database in production)
const authenticatedUsers = new Map();
// Map of verification codes to user details
const verificationCodes = new Map();

// Generate random 6-digit verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Bot Commands
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const telegramUserId = msg.from.id.toString();
  const username = msg.from.username || msg.from.first_name;

  bot.sendMessage(chatId,
    `👋 Welcome to A_Eye Notification Bot!\n\n` +
    `To receive notifications, you need to link your account.\n\n` +
    `Your Telegram User ID: ${telegramUserId}\n\n` +
    `Please use the /verify command with the code provided by the website:\n` +
    `/verify YOUR_CODE`
  );
});

bot.onText(/\/verify (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const telegramUserId = msg.from.id.toString();
  const username = msg.from.username || msg.from.first_name;
  const code = match[1].trim();

  // Check if verification code exists
  const userDetails = verificationCodes.get(code);

  if (!userDetails) {
    bot.sendMessage(chatId, '❌ Invalid verification code. Please get a new code from the website.');
    return;
  }

  // Link the user
  authenticatedUsers.set(telegramUserId, {
    chatId: chatId,
    username: username,
    userId: userDetails.userId,
    email: userDetails.email,
    name: userDetails.name,
    linkedAt: new Date().toISOString()
  });

  // Remove used verification code
  verificationCodes.delete(code);

  bot.sendMessage(chatId,
    `✅ Account linked successfully!\n\n` +
    `Name: ${userDetails.name}\n` +
    `Email: ${userDetails.email}\n\n` +
    `You will now receive notifications for violations and alerts.`
  );

  console.log(`User linked: ${username} (${telegramUserId}) -> ${userDetails.email}`);
});

bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  const telegramUserId = msg.from.id.toString();

  const user = authenticatedUsers.get(telegramUserId);

  if (!user) {
    bot.sendMessage(chatId, '❌ You are not linked to any account. Use /verify to link your account.');
    return;
  }

  bot.sendMessage(chatId,
    `✅ Account Status\n\n` +
    `Name: ${user.name}\n` +
    `Email: ${user.email}\n` +
    `Linked: ${new Date(user.linkedAt).toLocaleString()}\n\n` +
    `You are receiving notifications.`
  );
});

bot.onText(/\/unlink/, (msg) => {
  const chatId = msg.chat.id;
  const telegramUserId = msg.from.id.toString();

  const user = authenticatedUsers.get(telegramUserId);

  if (!user) {
    bot.sendMessage(chatId, '❌ You are not linked to any account.');
    return;
  }

  authenticatedUsers.delete(telegramUserId);
  bot.sendMessage(chatId, '✅ Account unlinked successfully. You will no longer receive notifications.');

  console.log(`User unlinked: ${telegramUserId}`);
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId,
    `🤖 A_Eye Notification Bot - Help\n\n` +
    `Commands:\n` +
    `/start - Start the bot and see your Telegram ID\n` +
    `/verify CODE - Link your account with verification code\n` +
    `/status - Check your account status\n` +
    `/unlink - Unlink your account\n` +
    `/help - Show this help message\n\n` +
    `Need help? Contact your administrator.`
  );
});

// API Endpoints

// Generate verification code for a user
app.post('/api/generate-code', (req, res) => {
  const { userId, email, name } = req.body;

  if (!userId || !email || !name) {
    return res.status(400).json({ error: 'Missing required fields: userId, email, name' });
  }

  const code = generateVerificationCode();

  // Store verification code (expires in 10 minutes)
  verificationCodes.set(code, { userId, email, name, createdAt: Date.now() });

  // Clean up expired codes
  setTimeout(() => {
    verificationCodes.delete(code);
  }, 10 * 60 * 1000); // 10 minutes

  res.json({
    success: true,
    code,
    expiresIn: '10 minutes'
  });

  console.log(`Verification code generated for ${email}: ${code}`);
});

// Get all authenticated users
app.get('/api/users', (req, res) => {
  const users = Array.from(authenticatedUsers.values()).map(user => ({
    telegramUserId: Array.from(authenticatedUsers.entries()).find(([k, v]) => v === user)?.[0],
    chatId: user.chatId,
    username: user.username,
    userId: user.userId,
    email: user.email,
    name: user.name,
    linkedAt: user.linkedAt
  }));

  res.json({ success: true, users });
});

// Send notification to specific user
app.post('/api/send-notification', async (req, res) => {
  const { userId, message, type } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: 'Missing required fields: userId, message' });
  }

  // Find user by userId
  const userEntry = Array.from(authenticatedUsers.entries()).find(
    ([telegramUserId, user]) => user.userId === userId
  );

  if (!userEntry) {
    return res.status(404).json({ error: 'User not found or not linked to Telegram' });
  }

  const [telegramUserId, user] = userEntry;
  const chatId = user.chatId;

  // Format message with emoji based on type
  let emoji = '📢';
  if (type === 'violation') emoji = '⚠️';
  if (type === 'ppe_violation') emoji = '🦺';
  if (type === 'unauthorized') emoji = '🚨';
  if (type === 'success') emoji = '✅';

  const formattedMessage = `${emoji} ${message}`;

  try {
    await bot.sendMessage(chatId, formattedMessage);
    res.json({
      success: true,
      message: 'Notification sent successfully',
      sentTo: user.email
    });
    console.log(`Notification sent to ${user.email}: ${message}`);
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification', details: error.message });
  }
});

// Send notification to multiple users
app.post('/api/send-bulk-notification', async (req, res) => {
  const { userIds, message, type } = req.body;

  if (!userIds || !Array.isArray(userIds) || !message) {
    return res.status(400).json({ error: 'Missing required fields: userIds (array), message' });
  }

  let emoji = '📢';
  if (type === 'violation') emoji = '⚠️';
  if (type === 'ppe_violation') emoji = '🦺';
  if (type === 'unauthorized') emoji = '🚨';
  if (type === 'success') emoji = '✅';

  const formattedMessage = `${emoji} ${message}`;

  const results = {
    success: [],
    failed: []
  };

  for (const userId of userIds) {
    const userEntry = Array.from(authenticatedUsers.entries()).find(
      ([telegramUserId, user]) => user.userId === userId
    );

    if (!userEntry) {
      results.failed.push({ userId, reason: 'User not found or not linked' });
      continue;
    }

    const [telegramUserId, user] = userEntry;
    const chatId = user.chatId;

    try {
      await bot.sendMessage(chatId, formattedMessage);
      results.success.push({ userId, email: user.email });
      console.log(`Notification sent to ${user.email}`);
    } catch (error) {
      results.failed.push({ userId, email: user.email, reason: error.message });
      console.error(`Failed to send to ${user.email}:`, error.message);
    }
  }

  res.json({
    success: true,
    results,
    sent: results.success.length,
    failed: results.failed.length
  });
});

// Unlink user account
app.post('/api/unlink', (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing required field: userId' });
  }

  // Find and remove user by userId
  const userEntry = Array.from(authenticatedUsers.entries()).find(
    ([telegramUserId, user]) => user.userId === userId
  );

  if (!userEntry) {
    return res.status(404).json({ error: 'User not found or not linked' });
  }

  const [telegramUserId, user] = userEntry;
  authenticatedUsers.delete(telegramUserId);

  console.log(`User unlinked: ${user.email} (${telegramUserId})`);

  res.json({
    success: true,
    message: 'Account unlinked successfully',
    email: user.email
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    bot: 'running',
    authenticatedUsers: authenticatedUsers.size,
    pendingVerifications: verificationCodes.size
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Telegram Bot Server running on port ${PORT}`);
  console.log(`✅ Bot is polling for messages`);
  console.log(`✅ API endpoints available at http://localhost:${PORT}`);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});
