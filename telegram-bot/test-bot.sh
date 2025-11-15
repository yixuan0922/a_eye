#!/bin/bash

# Telegram Bot Test Script
# This script tests all the bot endpoints

BOT_URL="${BOT_URL:-http://localhost:3001}"

echo "🤖 Testing Telegram Bot at: $BOT_URL"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HEALTH=$(curl -s $BOT_URL/health)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "$HEALTH" | jq '.'
else
    echo -e "${RED}✗ Health check failed${NC}"
fi
echo ""

# Test 2: Generate Verification Code
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Generate Verification Code"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
CODE_RESPONSE=$(curl -s -X POST $BOT_URL/api/generate-code \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test123",
    "email": "test@example.com",
    "name": "Test User"
  }')

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Code generation passed${NC}"
    echo "$CODE_RESPONSE" | jq '.'
    VERIFICATION_CODE=$(echo "$CODE_RESPONSE" | jq -r '.code')
    echo ""
    echo -e "${YELLOW}📋 Your verification code: $VERIFICATION_CODE${NC}"
    echo -e "${YELLOW}📱 Open Telegram and send: /verify $VERIFICATION_CODE${NC}"
else
    echo -e "${RED}✗ Code generation failed${NC}"
fi
echo ""

# Test 3: Get Users (before verification)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Get Linked Users"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
USERS=$(curl -s $BOT_URL/api/users)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Get users passed${NC}"
    echo "$USERS" | jq '.'
    USER_COUNT=$(echo "$USERS" | jq '.users | length')
    echo ""
    echo "Total linked users: $USER_COUNT"
else
    echo -e "${RED}✗ Get users failed${NC}"
fi
echo ""

# Test 4: Send Notification (will fail if user not linked)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Send Notification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}⚠️  This test requires a linked user${NC}"
echo "Press Enter after you've verified in Telegram, or Ctrl+C to skip..."
read

NOTIFY_RESPONSE=$(curl -s -X POST $BOT_URL/api/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test123",
    "message": "🎉 Test notification from test script!",
    "type": "success"
  }')

if [ $? -eq 0 ]; then
    SUCCESS=$(echo "$NOTIFY_RESPONSE" | jq -r '.success')
    if [ "$SUCCESS" == "true" ]; then
        echo -e "${GREEN}✓ Notification sent successfully${NC}"
        echo "$NOTIFY_RESPONSE" | jq '.'
        echo ""
        echo -e "${GREEN}📱 Check your Telegram for the message!${NC}"
    else
        echo -e "${RED}✗ Notification failed${NC}"
        echo "$NOTIFY_RESPONSE" | jq '.'
    fi
else
    echo -e "${RED}✗ Notification request failed${NC}"
fi
echo ""

# Test 5: Bulk Notification
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5: Bulk Notification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
BULK_RESPONSE=$(curl -s -X POST $BOT_URL/api/send-bulk-notification \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["test123"],
    "message": "🦺 Test PPE violation notification",
    "type": "ppe_violation"
  }')

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Bulk notification request completed${NC}"
    echo "$BULK_RESPONSE" | jq '.'
    SENT=$(echo "$BULK_RESPONSE" | jq -r '.sent')
    FAILED=$(echo "$BULK_RESPONSE" | jq -r '.failed')
    echo ""
    echo "Sent: $SENT, Failed: $FAILED"
else
    echo -e "${RED}✗ Bulk notification failed${NC}"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Testing Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. If verification code test passed, verify in Telegram"
echo "2. Run this script again to test notifications"
echo "3. Deploy to production (see DEPLOYMENT.md)"
echo "4. Update main app with bot URL"
echo ""
