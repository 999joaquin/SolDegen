# SolDegen - Setup Instructions

## Prerequisites
- Node.js 20+ 
- Python 3.8+
- pnpm (atau npm)

## Quick Start

### 1. Install Node.js Dependencies
```bash
pnpm install
```

### 2. Install Python Dependencies
```bash
cd python-backend
pip install -r requirements.txt
cd ..
```

### 3. Start Server (Auto-starts Python backend!)

**One Command - Everything Runs Automatically:**
```bash
node server.js
```

✅ **Node server** starts on port 3000
✅ **Python physics backend** auto-starts on port 8000

**Alternative - PowerShell Script:**
```powershell
.\start-servers.ps1
```

## Servers

- **Frontend & Game Logic**: http://localhost:3000
- **Python Physics**: http://localhost:8000

## Features

### Plinko Game
- ✅ Realistic physics simulation (Python backend)
- ✅ 16 rows dengan physics mantul realistis
- ✅ Multipliers: 0.2x - 2.0x (distributed fair)
- ✅ Real-time ball position updates via WebSocket

### Crash Game  
- ✅ Multiplayer crash game
- ✅ Real-time multiplier updates
- ✅ Chat system
- ✅ Provably fair

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   Frontend      │◄───────►│  Next.js Server  │
│  (React/Next)   │         │   (Port 3000)    │
└────────┬────────┘         └─────────┬────────┘
         │                            │
         │ Socket.IO                  │ Socket.IO
         │ (Game Events)              │ (/plinko, /crash)
         │                            │
         ▼                            ▼
┌─────────────────────────────────────────────┐
│           Socket.IO Namespaces              │
│   /plinko  →  Plinko game rounds           │
│   /crash   →  Crash game & chat            │
└─────────────────────────────────────────────┘
         │
         │ Physics simulation
         │ (Real-time positions)
         ▼
┌─────────────────┐
│ Python Physics  │
│  Backend (8000) │
│   FastAPI +     │
│   Socket.IO     │
└─────────────────┘
```

## Troubleshooting

### Python dependencies error
```bash
cd python-backend
pip install --upgrade pip
pip install -r requirements.txt
```

### Port already in use
Kill processes using ports 3000 or 8000:
```powershell
# Check what's using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### Physics not working
1. Check Python server is running on port 8000
2. Check browser console for WebSocket connection
3. Verify `.env.local` has `NEXT_PUBLIC_PHYSICS_SERVER_URL=http://localhost:8000`
