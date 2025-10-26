# HomeEase

A modern home services platform connecting users with service providers through an intelligent voice-enabled interface.

## Features

- **User Dashboard**: Browse, book, and manage home services
- **Provider Dashboard**: Manage services, bookings, and availability
- **Voice Assistant**: Real-time voice interaction powered by LiveKit
- **Authentication**: Secure user authentication with role-based access
- **Real-time Communication**: Live transcription and voice chat

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Shadcn UI + Radix UI components
- TailwindCSS
- React Router
- TanStack Query
- LiveKit Components
- Supabase

### Voice Agent
- LiveKit Agents
- Deepgram STT (Speech-to-Text)
- Python

## Project Structure

```
HomeEase/
├── frontend/          # React frontend application
├── livekit-agent/     # Voice assistant agent
└── fetch-agents/      # Backend agents
```

## Getting Started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### LiveKit Agent

```bash
cd livekit-agent
# Create .env.local with your LiveKit and Deepgram credentials
python agent.py
```

## Environment Variables

Create appropriate `.env` or `.env.local` files with:
- LiveKit API credentials
- Deepgram API key
- Supabase credentials

## License

Private project
