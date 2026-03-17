---
name: chatengine-mern
description: Build, repair, install, configure, and run the Chat Engine MERN website from this folder. Use when OpenClaw is asked to set up this project on a machine, install MongoDB, configure Google OAuth-only login, run the backend/frontend, wire OpenClaw as the AI provider, or troubleshoot why login/chat/session startup is failing.
---

## Repository

**GitHub:** https://github.com/sudarshansudarshan/sudarshansudarshan.github.io

**Clone on other machines:**
```bash
git clone https://github.com/sudarshansudarshan/sudarshansudarshan.github.io.git
cd sudarshansudarshan.github.io
```

**Note:** This folder was previously synced via iCloud which caused git object sync issues. Use GitHub for cross-machine sync instead.

---

# AI Behavior - Interview Mode

**IMPORTANT:** When responding to candidates in chat, you MUST strictly follow the rules defined in `CHAT_RULES.md`. Read that file and adhere to it for all conversations.

The chat operates in **Interview Mode** with the following constraints:

1. **Welcome Message:** Display the welcome message from `WELCOME.md` at the start of every session
2. **FAQ Reference:** Use `FAQ.md` to find answers to candidate questions
3. **Scope Limitation:** Only answer questions related to the internship opportunity
4. **Unknown Answers:** If you don't know the answer, ask for the candidate's email and mark the question with `#newquestion`
5. **Out of Scope:** Politely decline questions not related to the internship
6. **Student Records:** Maintain detailed student records as specified in CHAT_RULES.md

## Student Record Management

**Folder Location:** `~/Desktop/internship/`

**Naming Convention:** `<studentname>_<phonenumber>/`

**Required Files:**
- `chattranscript_<studentname>_<phonenumber>.txt` - Complete conversation transcript
- `profile_<studentname>_<phonenumber>.txt` - Detailed student profile with analysis

**Information to Collect (in order):**
- Full Name (ask first)
- Phone Number (ask, then ask to type again to confirm)
- Email Address (ask, then ask to type again to confirm)
- **Resume Upload (MANDATORY):** Ask student to upload their CV/resume in **PDF format only**. If the file is not PDF, reject it. If student doesn't have a resume ready, terminate the chat.
- Introduction (brief self-introduction)
- Why do you want to do an internship with us?
- LinkedIn Profile link
- Google Account Info (from Google OAuth login - name, email, picture from Google)

**Session Timing:**
- **Chat Start Time:** Record when the chat session begins (from Google OAuth login time)
- **Chat End Time:** Record when the session ends
- **Inactivity Timeout:** If the user doesn't respond for 5 minutes, end the session automatically
- **Maximum Session Duration:** Chat session cannot exceed **30 minutes** total

**Termination Conditions:**
1. If student refuses to provide phone number: "We can't continue with the chat as the phone number is compulsory for identification and communication purposes."
2. If user is inactive for 5 minutes: End session and save final transcript

All rules and procedures are documented in `CHAT_RULES.md` — follow them exactly.

# Chat Engine MERN - Complete Setup & Run Guide

This folder contains a complete MERN-stack chat website with:
- **Google OAuth** login only
- **MongoDB** for data persistence
- **OpenClaw** for AI-powered chat responses
- **React + Vite** frontend
- **Express + Node.js** backend

## Quick Start (If You Have Everything)

If you already have Node.js, MongoDB, and OpenClaw running locally:

```bash
# 1. Install dependencies
npm install && npm install --prefix server && npm install --prefix web-client

# 2. Start backend (port 5001)
cd server && node server.js

# 3. Start frontend (port 3000) - in another terminal
cd web-client && npm run dev -- --host 127.0.0.1
```

Then open: **http://127.0.0.1:3000/**

---

## Deployment Verification (Always Do This!)

After starting the servers, always verify everything is working:

### Quick Verification

```bash
# Check if servers are responding
curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://127.0.0.1:3000/
curl -s -o /dev/null -w "Backend: %{http_code}\n" http://127.0.0.1:5001/api/health
```

Expected output:
```
Frontend: 200
Backend: 200
```

### Full Health Check Script

Create a script `deploy-check.sh` in the `mern/` folder:

```bash
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

# Check OpenClaw
echo -n "OpenClaw: "
OPENCLAW=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:18789/api/health 2>/dev/null)
if [ "$OPENCLAW" = "200" ]; then
  echo -e "${GREEN}✅ OK${NC}"
else
  echo -e "${YELLOW}⚠️  Not running or not reachable${NC}"
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
```

Run it with: `bash deploy-check.sh`

### Auto-Restart Script

If a service is down, restart it:

```bash
# Restart backend
cd /Users/sudarshaniyengar/Desktop/chatengine/mern/server
pkill -f "node.*server.js" 2>/dev/null
node server.js &

# Restart frontend
cd /Users/sudarshaniyengar/Desktop/chatengine/mern/web-client
pkill -f "vite" 2>/dev/null
npm run dev -- --host 127.0.0.1 &
```

### Continuous Monitoring (Optional)

Set up a cron job to check every 5 minutes:

```bash
crontab -e
# Add this line:
*/5 * * * * cd /Users/sudarshaniyengar/Desktop/chatengine/mern && bash deploy-check.sh >> /tmp/deploy-check.log 2>&1
```

---

## Complete Step-by-Step Setup

### Step 1: Install Node.js Dependencies

```bash
# From the mern folder (project root)
npm install

# Install server dependencies
npm install --prefix server

# Install frontend dependencies
npm install --prefix web-client
```

### Step 2: Install and Start MongoDB

**On macOS with Homebrew:**

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community

# Verify MongoDB is running
mongosh --quiet --eval 'db.runCommand({ ping: 1 })'
```

**On Linux/Windows:**
- Download MongoDB Community Server from mongodb.com
- Or use MongoDB Atlas (cloud) and update MONGO_URI in env

### Step 3: Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a project (or use existing)
3. Go to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth client ID**
5. Application type: **Web application**
6. Add **Authorized JavaScript origins**:
   - `http://127.0.0.1:3000`
   - `http://localhost:3000`
7. Copy the **Client ID** (looks like: `123456789-abc.apps.googleusercontent.com`)

### Step 4: Configure Environment Files

Create **server/.env**:

```env
PORT=5001
CLIENT_URL=http://127.0.0.1:3000
JWT_SECRET=<generate-a-secure-random-string>
GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com
MONGO_URI=mongodb://localhost:27017/chatengine
OPENCLAW_URL=http://localhost:18789
OPENCLAW_API_KEY=<see-step-5>
OPENCLAW_CHAT_PATH=/v1/chat/completions
SKILL_FILE=/Users/sudarshaniyengar/Desktop/chatengine/mern/SKILL.md
ENABLE_MOCK_FALLBACK=true
DEV_BYPASS_AUTH=false
```

Create **web-client/.env**:

```env
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com
VITE_API_BASE_URL=http://127.0.0.1:5001/api
```

### Step 5: Enable OpenClaw Chat Completions

The app uses OpenClaw's `/v1/chat/completions` endpoint. You need to:

1. **Get your OpenClaw gateway token:**

```bash
# Check your OpenClaw config
cat ~/.openclaw/openclaw.json | grep -A5 '"auth"'
```

Or look for the token in the `gateway.auth.token` field.

2. **Enable the chat completions endpoint** (if not already enabled):

Add to your OpenClaw config (`~/.openclaw/openclaw.json`):

```json
{
  "gateway": {
    "http": {
      "endpoints": {
        "chatCompletions": {
          "enabled": true
        }
      }
    }
  }
}
```

3. **Restart OpenClaw gateway:**

```bash
openclaw gateway restart
```

4. **Update server/.env with the token:**

```env
OPENCLAW_API_KEY=<your-gateway-token>
```

### Step 6: Start the Application

**Terminal 1 - Backend:**

```bash
cd /path/to/mern/server
node server.js
```

Expected output:
```
🚀 Server running on port 5001
✅ MongoDB connected
```

**Terminal 2 - Frontend:**

```bash
cd /path/to/mern/web-client
npm run dev -- --host 127.0.0.1
```

Expected output:
```
VITE v5.x.x ready in xxx ms
Local: http://127.0.0.1:3000/
```

### Step 7: Use the App

1. Open **http://127.0.0.1:3000/** in your browser
2. Click **Sign in with Google**
3. After authentication, you'll see the chat interface
4. Click **+ New chat** to start a conversation
5. Type a message and press Enter to send

---

## Runtime Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite) | 3000 | http://127.0.0.1:3000 |
| Backend (Express) | 5001 | http://127.0.0.1:5001 |
| MongoDB | 27017 | localhost:27017 |
| OpenClaw Gateway | 18789 | http://localhost:18789 |

---

## Environment Variables Reference

### server/.env

| Variable | Description | Example |
|----------|-------------|---------|
| PORT | Backend server port | 5001 |
| CLIENT_URL | Frontend URL for CORS | http://127.0.0.1:3000 |
| JWT_SECRET | Secret for signing session cookies | (generate random) |
| GOOGLE_CLIENT_ID | Google OAuth Client ID | 123...apps.googleusercontent.com |
| MONGO_URI | MongoDB connection string | mongodb://localhost:27017/chatengine |
| OPENCLAW_URL | OpenClaw gateway URL | http://localhost:18789 |
| OPENCLAW_API_KEY | OpenClaw gateway token | (from config) |
| OPENCLAW_CHAT_PATH | AI endpoint path | /v1/chat/completions |
| SKILL_FILE | Path to SKILL.md | ../../SKILL.md |
| ENABLE_MOCK_FALLBACK | Use mock if OpenClaw fails | true |
| DEV_BYPASS_AUTH | Enable dev-only login | false |

### web-client/.env

| Variable | Description | Example |
|----------|-------------|---------|
| VITE_GOOGLE_CLIENT_ID | Google OAuth Client ID | 123...apps.googleusercontent.com |
| VITE_API_BASE_URL | Backend API URL | http://127.0.0.1:5001/api |

---

## Troubleshooting

### Frontend won't start

```bash
# Kill any existing processes on port 3000
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Restart
cd web-client && npm run dev -- --host 127.0.0.1
```

### Backend won't start

```bash
# Kill any existing processes on port 5001
lsof -i :5001 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Check MongoDB is running
mongosh --quiet --eval 'db.runCommand({ ping: 1 })'

# Restart backend
cd server && node server.js
```

### Google Login Errors

- **invalid_client**: Client ID is wrong or not created in Google Cloud
- **no registered origin**: Add `http://127.0.0.1:3000` to Authorized JavaScript origins in Google Cloud
- **payload audience mismatch**: Ensure same client ID in both server/.env and web-client/.env

### Chat returns mock responses instead of real AI

1. Check OpenClaw is running:
```bash
curl http://localhost:18789/v1/chat/completions -H 'Authorization: Bearer <token>' -d '{"model":"openclaw:main","messages":[{"role":"user","content":"hi"}]}'
```

2. Verify OPENCLAW_API_KEY is set correctly in server/.env

3. Check server logs for errors

### MongoDB Connection Failed

```bash
# Check if MongoDB is running
brew services list | grep mongodb

# Start MongoDB
brew services start mongodb/brew/mongodb-community
```

---

## Project Structure

```
mern/
├── package.json              # Root scripts (install-all, dev)
├── README.md                 # Project documentation
├── SKILL.md                 # This file - operational guide
├── CREATION_LOG.md          # Detailed build/debug history
├── server/
│   ├── package.json
│   ├── server.js            # Express server entry
│   ├── .env                # Server environment (create from .env.example)
│   ├── .env.example         # Template for server/.env
│   ├── devStore.js         # In-memory store (debug)
│   ├── middleware/
│   │   └── auth.js         # Authentication middleware
│   ├── models/
│   │   ├── User.js        # MongoDB user model
│   │   ├── Session.js     # MongoDB session model
│   │   └── Message.js     # MongoDB message model
│   └── routes/
│       ├── auth.js        # Google OAuth & session routes
│       ├── sessions.js    # Chat session CRUD
│       ├── messages.js   # Message CRUD
│       └── chat.js       # OpenClaw AI integration
└── web-client/
    ├── package.json
    ├── .env               # Frontend environment (create from .env.example)
    ├── .env.example      # Template for web-client/.env
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx      # React entry
        ├── App.jsx      # Main app component
        └── index.css    # Global styles
```

---

## How AI Integration Works

1. User sends a message via the frontend
2. Backend stores the user message in MongoDB
3. Backend loads the conversation transcript
4. Backend reads `SKILL.md` for AI behavior instructions
5. Backend constructs a prompt with:
   - System role
   - SKILL.md contents
   - User identity
   - Conversation history
6. Backend sends to OpenClaw at `/v1/chat/completions`
7. OpenClaw returns the AI response
8. Backend stores the response and returns it to frontend

---

## Current Configuration

This deployment uses:
- **Model**: MiniMax (configured in OpenClaw)
- **Auth**: Google OAuth only
- **Database**: MongoDB (local)
- **AI**: OpenClaw Gateway at localhost:18789

---

## Adding More Models

To use different AI models:

1. Run OpenClaw onboarding:
```bash
openclaw onboard
```

2. Select or configure additional providers (OpenAI, Anthropic, etc.)

3. Update the model in `server/routes/chat.js` if needed

---

## Files to Check If Something Breaks

- `CREATION_LOG.md` - Full history of what was built and why
- `server/routes/chat.js` - AI integration logic
- `server/routes/auth.js` - Google OAuth handling
- `server/.env` - All configuration
- `web-client/.env` - Frontend configuration

---

## Support

If you encounter issues:
1. Check `CREATION_LOG.md` for detailed history
2. Verify all environment variables are set
3. Ensure MongoDB is running
4. Verify OpenClaw gateway is accessible
5. Check browser console for frontend errors
6. Check server terminal for backend errors
