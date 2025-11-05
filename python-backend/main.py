import os
import math
import random
import asyncio
from typing import List, Dict, Tuple

import numpy as np
import socketio
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ----------------------
# Env config (safe defaults)
# ----------------------
HOST = os.getenv("PY_HOST", "0.0.0.0")
PORT = int(os.getenv("PY_PORT", "8000"))
RELOAD = os.getenv("PY_RELOAD", "false").lower() == "true"

# CORS: comma-separated list or "*" (default open for reverse-proxy setups)
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
if CORS_ORIGINS.strip() == "*":
    ALLOW_ORIGINS = ["*"]
else:
    ALLOW_ORIGINS = [o.strip() for o in CORS_ORIGINS.split(",") if o.strip()]

# ----------------------
# FastAPI + Socket.IO (ASGI)
# ----------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)

socket_app = socketio.ASGIApp(sio, app)

# ----------------------
# Physics constants
# ----------------------
GRAVITY = 0.5       # px / frame^2
BOARD_WIDTH = 800
BOARD_HEIGHT = 700
PEG_RADIUS = 5
BALL_RADIUS = 8
RESTITUTION = 0.7
FRICTION = 0.98
FPS = 60
FRAME_TIME = 1000 / FPS  # ms

# Plinko board configuration (16 rows)
ROWS = 16
START_Y = 80
ROW_SPACING = 32
COL_SPACING = 35

# Multipliers - 19 bins
MULTIPLIERS = [10.0, 8.0, 5.0, 3.0, 1.0, 0.9, 0.6, 0.4, 0.3, 0.2,
               0.3, 0.4, 0.6, 0.9, 1.0, 3.0, 5.0, 8.0, 10.0]
NUM_BINS = len(MULTIPLIERS)  # 19

# ----------------------
# Ball simulation
# ----------------------
class Ball:
    def __init__(self, start_x: float, ball_id: str):
        self.id = ball_id
        self.x = start_x
        self.y = START_Y
        self.vx = random.uniform(-2, 2)  # initial horizontal velocity
        self.vy = 1                      # small downward kick
        self.positions: List[Dict] = []
        self.finished = False
        self.multiplier = 0

    def get_pegs(self) -> List[Tuple[float, float]]:
        """Generate peg positions for collision detection - match frontend layout"""
        pegs = []
        for i in range(ROWS):
            for j in range(i + 1):
                x = BOARD_WIDTH / 2 + (j - i / 2) * COL_SPACING
                y = START_Y + i * ROW_SPACING
                pegs.append((x, y))
        return pegs

    def check_collision(self, pegs: List[Tuple[float, float]]) -> bool:
        """Check and handle collision with pegs"""
        collision = False
        for peg_x, peg_y in pegs:
            dx = self.x - peg_x
            dy = self.y - peg_y
            distance = math.sqrt(dx * dx + dy * dy)

            if distance < (BALL_RADIUS + PEG_RADIUS):
                collision = True

                # Collision normal
                if distance == 0:
                    distance = 0.01
                nx = dx / distance
                ny = dy / distance

                # Push ball out of overlap
                overlap = (BALL_RADIUS + PEG_RADIUS) - distance
                self.x += nx * overlap
                self.y += ny * overlap

                # Reflect velocity with restitution
                dot = self.vx * nx + self.vy * ny
                self.vx = (self.vx - 2 * dot * nx) * RESTITUTION
                self.vy = (self.vy - 2 * dot * ny) * RESTITUTION

                # Small random horizontal push
                self.vx += random.uniform(-0.5, 0.5)
        return collision

    def update(self, pegs: List[Tuple[float, float]]) -> Dict:
        """Update ball physics for one frame"""
        if self.finished:
            return None

        # Gravity + friction
        self.vy += GRAVITY
        self.vx *= FRICTION
        self.vy *= FRICTION

        # Integrate
        self.x += self.vx
        self.y += self.vy

        # Collide with pegs
        self.check_collision(pegs)

        # Horizontal bounds
        if self.x < BALL_RADIUS:
            self.x = BALL_RADIUS
            self.vx *= -RESTITUTION
        elif self.x > BOARD_WIDTH - BALL_RADIUS:
            self.x = BOARD_WIDTH - BALL_RADIUS
            self.vx *= -RESTITUTION

        # Bottom (bin area)
        bin_y = START_Y + ROWS * ROW_SPACING + 50
        if self.y > bin_y:
            self.finished = True

            # Map x position to bin index
            relative_x = self.x - (BOARD_WIDTH / 2)
            bin_index = round((relative_x / COL_SPACING) + ((NUM_BINS - 1) / 2))
            bin_index = max(0, min(NUM_BINS - 1, bin_index))
            self.multiplier = MULTIPLIERS[bin_index]

            print(f"🎯 Ball finished! pos=({self.x:.1f},{self.y:.1f}) -> bin {bin_index} -> {self.multiplier}x")

            return {
                "x": self.x,
                "y": self.y,
                "finished": True,
                "multiplier": self.multiplier
            }

        pos = {"x": round(self.x, 2), "y": round(self.y, 2), "finished": False}
        self.positions.append(pos)
        return pos


# Active simulations keyed by client sid
active_balls: Dict[str, Dict] = {}

# ----------------------
# Socket.IO events
# ----------------------
@sio.on("connect")
async def on_connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.on("disconnect")
async def on_disconnect(sid):
    print(f"Client disconnected: {sid}")
    if sid in active_balls:
        del active_balls[sid]

@sio.on("start_physics")
async def start_physics(sid, data):
    """Start a new ball physics simulation"""
    try:
        ball_id = data.get("ballId")
        start_x = data.get("startX", BOARD_WIDTH / 2)

        print(f"Starting physics for ball {ball_id} at x={start_x}")

        ball = Ball(start_x, ball_id)
        pegs = ball.get_pegs()

        active_balls[sid] = {"ball": ball, "pegs": pegs, "task": None}
        task = asyncio.create_task(simulate_ball(sid, ball_id))
        active_balls[sid]["task"] = task

    except Exception as e:
        print(f"Error starting physics: {e}")
        await sio.emit("physics_error", {"error": str(e)}, room=sid)

async def simulate_ball(sid: str, ball_id: str):
    """Simulate ball physics and emit position updates"""
    try:
        if sid not in active_balls:
            return

        ball = active_balls[sid]["ball"]
        pegs = active_balls[sid]["pegs"]

        frame = 0
        max_frames = FPS * 10  # up to 10 seconds

        print(f"🚀 Simulating {ball_id} from ({ball.x:.1f},{ball.y:.1f})")

        while not ball.finished and frame < max_frames:
            position = ball.update(pegs)
            if position:
                await sio.emit("physics_update", {"ballId": ball_id, "position": position}, room=sid)

                if frame % 30 == 0:
                    print(f"📍 Frame {frame}: ({ball.x:.1f},{ball.y:.1f}) vy={ball.vy:.2f}")

            await asyncio.sleep(FRAME_TIME / 1000)
            frame += 1

        if frame >= max_frames:
            print(f"⏰ Simulation timeout for {ball_id} at frame {frame}")

        if ball.finished:
            payload = {
                "ballId": ball_id,
                "multiplier": ball.multiplier,
                "finalX": ball.x,
                "finalY": ball.y
            }
            print(f"📤 physics_complete -> {sid}: {payload}")
            await sio.emit("physics_complete", payload, room=sid)
            print("✅ physics_complete emitted")

        if sid in active_balls:
            del active_balls[sid]

    except Exception as e:
        print(f"Error in simulation: {e}")
        await sio.emit("physics_error", {"error": str(e)}, room=sid)

# ----------------------
# REST endpoints
# ----------------------
@app.get("/")
async def root():
    return {"status": "Plinko Physics Server Running"}

@app.get("/health")
async def health():
    return {"status": "healthy", "active_simulations": len(active_balls)}

# ----------------------
# Entry
# ----------------------
if __name__ == "__main__":
    print(f"Starting Plinko Physics Server on {HOST}:{PORT} (reload={RELOAD})...")
    uvicorn.run(
        "main:socket_app",
        host=HOST,
        port=PORT,
        reload=RELOAD,
        log_level="info",
    )
