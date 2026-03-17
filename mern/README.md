# Chat Engine (MERN + Google Auth + OpenClaw)

A MERN-stack chat website with **Google-only sign-in** and an **OpenClaw-powered** assistant. After users authenticate with Google, they can create chats and talk to an AI engine whose behavior is guided by `SKILL.md`.

## What it does

- blocks entry unless the user signs in with Google
- stores users, sessions, and messages in MongoDB
- provides a React/Vite chat UI in `web-client/`
- uses Express/Node on the backend in `server/`
- forwards chat requests to OpenClaw
- injects `SKILL.md` into the prompt/context sent to the AI layer

## Environment

### Server (`server/.env`)
Copy `server/.env.example` to `server/.env`.

### Client (`web-client/.env`)
Copy `web-client/.env.example` to `web-client/.env`.

Required client env:
- `VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com`
- `VITE_API_BASE_URL=http://localhost:5000/api`

## Install

```bash
npm run install-all
```

## Run

```bash
npm run dev
```

- web client: `http://localhost:3000`
- server: `http://localhost:5000`

## Notes

- Google auth is the only entry path.
- The backend reads `SKILL.md` on each chat request and includes it in the prompt sent to OpenClaw.
