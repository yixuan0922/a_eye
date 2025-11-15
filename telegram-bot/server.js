const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
const { prisma } = require('./db');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Telegram Bot Configuration
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_TOKEN) {
  console.error('❌ ERROR: TELEGRAM_BOT_TOKEN is not set in environment variables');
  console.error('Please add TELEGRAM_BOT_TOKEN to your .env file');
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Map of verification codes to user details (temporary, 10 min expiry)
const verificationCodes = new Map();

// Generate random 6-digit verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Bot Commands
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramUserId = msg.from.id.toString();
  const username = msg.from.username || msg.from.first_name;

  // Check if user is already linked
  const existingLink = await prisma.telegramLink.findUnique({
    where: { telegramUserId },
    include: { user: true }
  });

  if (existingLink) {
    bot.sendMessage(chatId,
      `👋 Welcome back, ${username}!\n\n` +
      `Your account is already linked to: ${existingLink.user.email}\n\n` +
      `You are receiving notifications for violations and alerts.\n\n` +
      `Use /status to check your link status or /unlink to disconnect.`
    );
  } else {
    bot.sendMessage(chatId,
      `👋 Welcome to A_Eye Notification Bot!\n\n` +
      `To receive notifications, you need to link your account.\n\n` +
      `Your Telegram User ID: ${telegramUserId}\n\n` +
      `Please use the /verify command with the code provided by the website:\n` +
      `/verify YOUR_CODE`
    );
  }
});

bot.onText(/\/verify (.+)/, async (msg, match) => {
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

  try {
    // Check if this Telegram account is already linked
    const existingLink = await prisma.telegramLink.findUnique({
      where: { telegramUserId }
    });

    if (existingLink) {
      // Update existing link
      await prisma.telegramLink.update({
        where: { telegramUserId },
        data: {
          userId: userDetails.userId,
          telegramChatId: chatId.toString(),
          telegramUsername: username,
        }
      });
    } else {
      // Create new link
      await prisma.telegramLink.create({
        data: {
          userId: userDetails.userId,
          telegramUserId: telegramUserId,
          telegramChatId: chatId.toString(),
          telegramUsername: username,
        }
      });
    }

    // Remove used verification code
    verificationCodes.delete(code);

    bot.sendMessage(chatId,
      `✅ Account linked successfully!\n\n` +
      `Name: ${userDetails.name}\n` +
      `Email: ${userDetails.email}\n\n` +
      `You will now receive notifications for violations and alerts.`
    );

    console.log(`User linked: ${username} (${telegramUserId}) -> ${userDetails.email}`);
  } catch (error) {
    console.error('Error linking account:', error);
    bot.sendMessage(chatId, '❌ Failed to link account. Please try again or contact support.');
  }
});

bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramUserId = msg.from.id.toString();

  try {
    const link = await prisma.telegramLink.findUnique({
      where: { telegramUserId },
      include: { user: true }
    });

    if (!link) {
      bot.sendMessage(chatId, '❌ You are not linked to any account. Use /verify to link your account.');
      return;
    }

    bot.sendMessage(chatId,
      `✅ Account Status\n\n` +
      `Name: ${link.user.name}\n` +
      `Email: ${link.user.email}\n` +
      `Linked: ${new Date(link.linkedAt).toLocaleString()}\n\n` +
      `You are receiving notifications.`
    );
  } catch (error) {
    console.error('Error checking status:', error);
    bot.sendMessage(chatId, '❌ Failed to check status. Please try again.');
  }
});

bot.onText(/\/unlink/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramUserId = msg.from.id.toString();

  try {
    const link = await prisma.telegramLink.findUnique({
      where: { telegramUserId }
    });

    if (!link) {
      bot.sendMessage(chatId, '❌ You are not linked to any account.');
      return;
    }

    await prisma.telegramLink.delete({
      where: { telegramUserId }
    });

    bot.sendMessage(chatId, '✅ Account unlinked successfully. You will no longer receive notifications.');

    console.log(`User unlinked: ${telegramUserId}`);
  } catch (error) {
    console.error('Error unlinking account:', error);
    bot.sendMessage(chatId, '❌ Failed to unlink account. Please try again.');
  }
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
app.get('/api/users', async (req, res) => {
  try {
    const links = await prisma.telegramLink.findMany({
      include: { user: true }
    });

    const users = links.map(link => ({
      telegramUserId: link.telegramUserId,
      chatId: link.telegramChatId,
      username: link.telegramUsername,
      userId: link.userId,
      email: link.user.email,
      name: link.user.name,
      linkedAt: link.linkedAt
    }));

    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Send notification to specific user
app.post('/api/send-notification', async (req, res) => {
  const { userId, message, type, imageUrl } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: 'Missing required fields: userId, message' });
  }

  try {
    // Find user by userId
    const link = await prisma.telegramLink.findUnique({
      where: { userId },
      include: { user: true }
    });

    if (!link) {
      return res.status(404).json({ error: 'User not found or not linked to Telegram' });
    }

    const chatId = link.telegramChatId;

    // Format message with emoji based on type
    let emoji = '📢';
    if (type === 'violation') emoji = '⚠️';
    if (type === 'ppe_violation') emoji = '🦺';
    if (type === 'unauthorized') emoji = '🚨';
    if (type === 'success') emoji = '✅';

    const formattedMessage = `${emoji} ${message}`;

    // Send image with caption if imageUrl is provided
    if (imageUrl) {
      await bot.sendPhoto(chatId, imageUrl, { caption: formattedMessage });
    } else {
      await bot.sendMessage(chatId, formattedMessage);
    }

    res.json({
      success: true,
      message: 'Notification sent successfully',
      sentTo: link.user.email
    });
    console.log(`Notification sent to ${link.user.email}: ${message}`);
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification', details: error.message });
  }
});

// Send notification to multiple users
app.post('/api/send-bulk-notification', async (req, res) => {
  const { userIds, message, type, imageUrl } = req.body;

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

  try {
    // Fetch all links for the given userIds
    const links = await prisma.telegramLink.findMany({
      where: { userId: { in: userIds } },
      include: { user: true }
    });

    // Create a map for quick lookup
    const linkMap = new Map(links.map(link => [link.userId, link]));

    for (const userId of userIds) {
      const link = linkMap.get(userId);

      if (!link) {
        results.failed.push({ userId, reason: 'User not found or not linked' });
        continue;
      }

      const chatId = link.telegramChatId;

      try {
        // Send image with caption if imageUrl is provided
        if (imageUrl) {
          await bot.sendPhoto(chatId, imageUrl, { caption: formattedMessage });
        } else {
          await bot.sendMessage(chatId, formattedMessage);
        }
        results.success.push({ userId, email: link.user.email });
        console.log(`Notification sent to ${link.user.email}`);
      } catch (error) {
        results.failed.push({ userId, email: link.user.email, reason: error.message });
        console.error(`Failed to send to ${link.user.email}:`, error.message);
      }
    }

    res.json({
      success: true,
      results,
      sent: results.success.length,
      failed: results.failed.length
    });
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    res.status(500).json({ error: 'Failed to send bulk notifications' });
  }
});

// Unlink user account
app.post('/api/unlink', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing required field: userId' });
  }

  try {
    const link = await prisma.telegramLink.findUnique({
      where: { userId },
      include: { user: true }
    });

    if (!link) {
      return res.status(404).json({ error: 'User not found or not linked' });
    }

    await prisma.telegramLink.delete({
      where: { userId }
    });

    console.log(`User unlinked: ${link.user.email} (${link.telegramUserId})`);

    res.json({
      success: true,
      message: 'Account unlinked successfully',
      email: link.user.email
    });
  } catch (error) {
    console.error('Error unlinking user:', error);
    res.status(500).json({ error: 'Failed to unlink user' });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const linkedUsers = await prisma.telegramLink.count();
    res.json({
      status: 'ok',
      bot: 'running',
      linkedUsers: linkedUsers,
      pendingVerifications: verificationCodes.size
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Telegram Bot Server running on port ${PORT}`);
  console.log(`✅ Bot is polling for messages`);
  console.log(`✅ API endpoints available at http://localhost:${PORT}`);
  console.log(`✅ Using database storage for persistent links`);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});
