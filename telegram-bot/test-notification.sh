#!/bin/bash

# Test script to send a violation notification to Telegram
# Usage: ./test-notification.sh <TELEGRAM_USER_ID>

if [ -z "$1" ]; then
    echo "Usage: ./test-notification.sh <TELEGRAM_USER_ID>"
    echo ""
    echo "To get your Telegram User ID:"
    echo "1. Open Telegram and search for your bot"
    echo "2. Send /start to the bot"
    echo "3. The bot will show your Telegram User ID"
    echo ""
    echo "Example: ./test-notification.sh 123456789"
    exit 1
fi

TELEGRAM_USER_ID=$1

echo "========================================="
echo "Sending Test Notification"
echo "========================================="
echo "Target Telegram User ID: $TELEGRAM_USER_ID"
echo ""

# Send test notification
curl -X POST http://localhost:3001/api/send-notification \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TELEGRAM_USER_ID\",
    \"message\": \"🦺 PPE VIOLATION DETECTED\n\nPerson: John Doe\nLocation: Construction Site A\nCamera: Main Entrance\nMissing PPE: Hard_hat, Safety_vest\nSeverity: HIGH\nTime: $(date)\n\nAction Required: Please investigate immediately.\",
    \"type\": \"ppe_violation\"
  }"

echo ""
echo ""
echo "========================================="
echo "Check your Telegram app for the notification!"
echo "========================================="
