# Plinko Physics Backend

Python backend untuk simulasi physics realistic bola Plinko menggunakan FastAPI dan Socket.IO.

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run server:**
   ```bash
   python main.py
   ```

Server akan jalan di `http://localhost:8000`

## Features

- ✅ Realistic physics dengan gravity, collision, dan bounce
- ✅ Bola mantul di setiap peg (bukan teleport)
- ✅ Real-time position updates via WebSocket
- ✅ Sinkronisasi dengan frontend (16 rows, multipliers 0.2x - 2.0x)

## Physics Parameters

- **Gravity**: 0.5 pixels/frame²
- **Restitution**: 0.7 (bounce coefficient)
- **Friction**: 0.98 (velocity dampening)
- **FPS**: 60 frames per second
- **Rows**: 16 (sesuai FIXED_ROWS di constants.ts)

## Events

### Client → Server
- `start_physics`: Mulai simulasi bola baru
  ```json
  {
    "ballId": "ball_123",
    "startX": 400  // optional, default center
  }
  ```

### Server → Client
- `physics_update`: Update posisi bola setiap frame
  ```json
  {
    "ballId": "ball_123",
    "position": {
      "x": 405.2,
      "y": 120.5,
      "finished": false
    }
  }
  ```

- `physics_complete`: Bola selesai jatuh
  ```json
  {
    "ballId": "ball_123",
    "multiplier": 1.25,
    "finalX": 450.0,
    "finalY": 642.0
  }
  ```

- `physics_error`: Error handling
  ```json
  {
    "error": "Error message"
  }
  ```
