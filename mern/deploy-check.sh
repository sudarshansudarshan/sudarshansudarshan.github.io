#!/bin/bash
echo "=== Chat Engine Deployment Check ==="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check frontend
echo -n "Frontend (3000): "
FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/)
if [ "$FRONTEND" = "200" ]; then
  echo -e "${GREEN}✅ OK${NC}"
else
  echo -e "${RED}❌ FAILED (HTTP $FRONTEND)${NC}"
fi

# Check backend
echo -n "Backend (5001): "
BACKEND=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5001/api/health)
if [ "$BACKEND" = "200" ]; then
  echo -e "${GREEN}✅ OK${NC}"
else
  echo -e "${RED}❌ FAILED (HTTP $BACKEND)${NC}"
fi

# Check OpenClaw (just check if port is open)
echo -n "OpenClaw: "
if lsof -i :18789 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo -e "${GREEN}✅ OK (port 18789 open)${NC}"
else
  echo -e "${YELLOW}⚠️  Not running${NC}"
fi

# Test chat endpoint
echo -n "Chat API: "
CHAT=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5001/api/auth/me)
if [ "$CHAT" = "401" ] || [ "$CHAT" = "200" ]; then
  echo -e "${GREEN}✅ OK (auth endpoint working)${NC}"
else
  echo -e "${RED}❌ FAILED (HTTP $CHAT)${NC}"
fi

echo "=== Done ==="
