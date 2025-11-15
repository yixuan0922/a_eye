# Deployment Guide

This guide covers deploying the Telegram bot to production environments.

## Option 1: Deploy to AWS EC2

### Prerequisites
- AWS account with EC2 access
- SSH key pair for EC2 instance

### Step 1: Launch EC2 Instance

1. Go to AWS EC2 Console
2. Click "Launch Instance"
3. Choose:
   - **AMI**: Ubuntu Server 22.04 LTS
   - **Instance Type**: t2.micro (free tier eligible)
   - **Security Group**: Create/select one with these inbound rules:
     - SSH (22) from your IP
     - Custom TCP (3001) from anywhere (for the bot API)
4. Launch and download the `.pem` key file

### Step 2: Connect to EC2

```bash
# Make key file secure
chmod 400 your-key.pem

# Connect to instance
ssh -i your-key.pem ubuntu@<YOUR-EC2-PUBLIC-IP>
```

### Step 3: Install Node.js and Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

### Step 4: Deploy the Bot

```bash
# Create app directory
mkdir -p /home/ubuntu/apps
cd /home/ubuntu/apps

# Clone your repository (or upload files)
# Option A: If using Git
git clone <YOUR_REPO_URL>
cd telegram-bot

# Option B: If uploading files manually
# Use SCP from your local machine:
# scp -i your-key.pem -r ./telegram-bot ubuntu@<EC2-IP>:/home/ubuntu/apps/

# Install dependencies
npm install --production

# Create .env file
nano .env
```

Add to `.env`:
```env
TELEGRAM_BOT_TOKEN=8584793388:AAHbFnSkJbBNEbWUW0t3dYBEQUxsppy8yj0
PORT=3001
NODE_ENV=production
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

### Step 5: Start with PM2

```bash
# Create logs directory
mkdir -p logs

# Start the bot with PM2
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Copy and run the command that PM2 outputs

# Check status
pm2 status
pm2 logs telegram-bot
```

### Step 6: Configure Firewall (Optional but Recommended)

```bash
# Install UFW
sudo apt install -y ufw

# Allow SSH
sudo ufw allow 22

# Allow bot API
sudo ufw allow 3001

# Enable firewall
sudo ufw enable
```

### Step 7: Setup Nginx Reverse Proxy (Optional)

If you want to use a domain name:

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/telegram-bot
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/telegram-bot /etc/nginx/sites-enabled/

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Step 8: Test the Deployment

```bash
# Check if bot is running
curl http://localhost:3001/health

# From your local machine
curl http://<EC2-PUBLIC-IP>:3001/health
```

### Step 9: Update Bot URL in Main App

In your main A_Eye application, update the environment variable:

```env
# In your main app's .env
TELEGRAM_BOT_URL=http://<EC2-PUBLIC-IP>:3001
# Or if using domain:
TELEGRAM_BOT_URL=http://your-domain.com
```

### Useful PM2 Commands

```bash
# View logs
pm2 logs telegram-bot

# Restart bot
pm2 restart telegram-bot

# Stop bot
pm2 stop telegram-bot

# Monitor
pm2 monit

# View all processes
pm2 list
```

---

## Option 2: Deploy to Render.com

Render is easier and provides HTTPS automatically.

### Step 1: Prepare Repository

1. Push your code to GitHub:
```bash
cd telegram-bot
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO>
git push -u origin main
```

### Step 2: Create Render Account

1. Go to [https://render.com](https://render.com)
2. Sign up with GitHub
3. Click "New +" → "Web Service"

### Step 3: Configure Web Service

1. **Connect Repository**: Select your GitHub repo
2. **Configuration**:
   - **Name**: `telegram-bot` (or any name)
   - **Environment**: `Node`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Select "Free" (or paid for better performance)

3. **Environment Variables**:
   Click "Advanced" → Add environment variables:
   ```
   TELEGRAM_BOT_TOKEN = 8584793388:AAHbFnSkJbBNEbWUW0t3dYBEQUxsppy8yj0
   PORT = 3001
   NODE_ENV = production
   ```

4. Click "Create Web Service"

### Step 4: Wait for Deployment

Render will:
- Build your app
- Deploy it
- Provide a URL like: `https://telegram-bot-xxxx.onrender.com`

### Step 5: Test Deployment

```bash
# Test the health endpoint
curl https://telegram-bot-xxxx.onrender.com/health
```

### Step 6: Update Main App

Update your main A_Eye application:

```env
# In your main app's .env
TELEGRAM_BOT_URL=https://telegram-bot-xxxx.onrender.com
```

### Step 7: Keep Service Alive (Free Tier)

Render free tier sleeps after 15 minutes of inactivity. Options:

**Option A: Use a ping service**
- Use [UptimeRobot](https://uptimerobot.com) to ping your `/health` endpoint every 5 minutes

**Option B: Upgrade to paid plan**
- $7/month for always-on service

---

## Option 3: Deploy to Railway.app

### Step 1: Setup Railway

1. Go to [https://railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your telegram-bot repository

### Step 2: Configure

Railway auto-detects Node.js. Just add environment variables:

1. Go to "Variables" tab
2. Add:
   ```
   TELEGRAM_BOT_TOKEN = 8584793388:AAHbFnSkJbBNEbWUW0t3dYBEQUxsppy8yj0
   PORT = 3001
   ```

### Step 3: Deploy

- Railway automatically deploys
- You get a URL like: `https://telegram-bot-production.up.railway.app`

### Step 4: Update Main App

```env
TELEGRAM_BOT_URL=https://telegram-bot-production.up.railway.app
```

---

## Recommended Setup: EC2 for Production

For production use, I recommend AWS EC2 because:

✅ Full control over server
✅ Can run 24/7 reliably
✅ Better for services that need to be always online
✅ Free tier available for 12 months
✅ Easy to scale

**Cost Comparison:**
- **EC2 t2.micro**: Free for 12 months, then ~$8-10/month
- **Render**: Free (with sleep), or $7/month for always-on
- **Railway**: $5/month minimum

---

## Post-Deployment Checklist

After deploying to any platform:

- [ ] Test `/health` endpoint
- [ ] Test bot commands in Telegram (`/start`, `/help`)
- [ ] Generate verification code via API
- [ ] Link a test user with `/verify`
- [ ] Send test notification
- [ ] Update main app's `TELEGRAM_BOT_URL` environment variable
- [ ] Set up monitoring/alerts
- [ ] Configure backups (if storing data)

---

## Monitoring

### PM2 on EC2

```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Set log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Health Check Monitoring

Set up a service like:
- [UptimeRobot](https://uptimerobot.com) - Free
- [Pingdom](https://www.pingdom.com)
- AWS CloudWatch

Monitor: `https://your-bot-url/health`

---

## Troubleshooting

### Bot not responding
1. Check logs: `pm2 logs telegram-bot`
2. Verify bot token is correct
3. Restart: `pm2 restart telegram-bot`

### Port already in use
```bash
# Find what's using port 3001
sudo lsof -i :3001

# Kill the process
sudo kill -9 <PID>
```

### Out of memory
```bash
# Increase PM2 memory limit
pm2 restart telegram-bot --max-memory-restart 500M
```

---

## Security Best Practices

1. **Never commit .env to Git**
   - Already in `.gitignore`

2. **Use environment variables**
   - Don't hardcode the bot token

3. **Restrict EC2 security group**
   - Only allow necessary ports
   - Restrict SSH to your IP only

4. **Keep packages updated**
   ```bash
   npm update
   npm audit fix
   ```

5. **Use HTTPS** (with Nginx + Let's Encrypt or Render/Railway)

---

## Need Help?

- Check logs: `pm2 logs telegram-bot`
- Test health: `curl http://localhost:3001/health`
- Restart service: `pm2 restart telegram-bot`
- Contact your DevOps team
