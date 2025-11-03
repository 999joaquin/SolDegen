import asyncio
import socketio
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from typing import List, Dict, Tuple
import random
import math

# Create FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=False,
    engineio_logger=False
)

# Wrap with ASGI app
socket_app = socketio.ASGIApp(sio, app)

# Physics constants
GRAVITY = 0.5  # Pixels per frame^2
BOARD_WIDTH = 800  # Match frontend boardWidth
BOARD_HEIGHT = 700
PEG_RADIUS = 5  # Match frontend peg size
BALL_RADIUS = 8  # Reduced from 12 to prevent sticking
RESTITUTION = 0.7  # Bounce coefficient (0-1, lower = less bouncy)
FRICTION = 0.98  # Velocity dampening per frame
FPS = 60
FRAME_TIME = 1000 / FPS  # milliseconds

# Plinko board configuration (16 rows)
ROWS = 16
START_Y = 80
ROW_SPACING = 32
COL_SPACING = 35

# Multipliers for 16-row board - Max 10x, Win 40% : Loss 60%
MULTIPLIERS = [10.0, 7.0, 4.0, 2.0, 0.9, 0.6, 0.4, 0.3, 0.2, 0.3, 0.4, 0.6, 0.9, 2.0, 4.0, 7.0, 10.0]


class Ball:
    def __init__(self, start_x: float, ball_id: str):
        self.id = ball_id
        self.x = start_x
        self.y = START_Y
        self.vx = random.uniform(-2, 2)  # Increased initial horizontal velocity
        self.vy = 1  # Small initial downward velocity to start movement
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
        collision_occurred = False
        
        for peg_x, peg_y in pegs:
            dx = self.x - peg_x
            dy = self.y - peg_y
            distance = math.sqrt(dx * dx + dy * dy)
            
            if distance < (BALL_RADIUS + PEG_RADIUS):
                # Collision detected!
                collision_occurred = True
                
                # Calculate collision normal
                if distance == 0:
                    distance = 0.01
                
                nx = dx / distance
                ny = dy / distance
                
                # Move ball out of collision
                overlap = (BALL_RADIUS + PEG_RADIUS) - distance
                self.x += nx * overlap
                self.y += ny * overlap
                
                # Calculate relative velocity
                dot_product = self.vx * nx + self.vy * ny
                
                # Reflect velocity with restitution
                self.vx = (self.vx - 2 * dot_product * nx) * RESTITUTION
                self.vy = (self.vy - 2 * dot_product * ny) * RESTITUTION
                
                # Add small random horizontal push for variety
                self.vx += random.uniform(-0.5, 0.5)
                
        return collision_occurred
    
    def update(self, pegs: List[Tuple[float, float]]) -> Dict:
        """Update ball physics for one frame"""
        if self.finished:
            return None
        
        # Apply gravity
        self.vy += GRAVITY
        
        # Apply friction
        self.vx *= FRICTION
        self.vy *= FRICTION
        
        # Update position
        self.x += self.vx
        self.y += self.vy
        
        # Check collisions with pegs
        self.check_collision(pegs)
        
        # Keep ball within horizontal bounds
        if self.x < BALL_RADIUS:
            self.x = BALL_RADIUS
            self.vx *= -RESTITUTION
        elif self.x > BOARD_WIDTH - BALL_RADIUS:
            self.x = BOARD_WIDTH - BALL_RADIUS
            self.vx *= -RESTITUTION
        
        # Check if ball reached bottom (bin area)
        bin_y = START_Y + ROWS * ROW_SPACING + 50  # Increased from 30 to 50 to prevent early disappearance
        if self.y > bin_y:
            self.finished = True
            # Calculate which multiplier bin it landed in based on horizontal position
            # Bins are positioned at: boardWidth/2 + (i - rows/2) * dx
            # So we reverse this calculation
            relative_x = self.x - (BOARD_WIDTH / 2)
            bin_index = round((relative_x / COL_SPACING) + (ROWS / 2))
            bin_index = max(0, min(len(MULTIPLIERS) - 1, bin_index))
            self.multiplier = MULTIPLIERS[bin_index]
            
            print(f'🎯 Ball finished! Position: ({self.x:.1f}, {self.y:.1f}) → Bin {bin_index} → {self.multiplier}x')
            
            return {
                'x': self.x,
                'y': self.y,
                'finished': True,
                'multiplier': self.multiplier
            }
        
        # Record position
        position = {
            'x': round(self.x, 2),
            'y': round(self.y, 2),
            'finished': False
        }
        self.positions.append(position)
        
        return position


# Store active ball simulations
active_balls: Dict[str, Dict] = {}


@sio.on('connect')
async def connect(sid, environ):
    print(f'Client connected: {sid}')


@sio.on('disconnect')
async def disconnect(sid):
    print(f'Client disconnected: {sid}')
    # Clean up any active balls for this client
    if sid in active_balls:
        del active_balls[sid]


@sio.on('start_physics')
async def start_physics(sid, data):
    """Start a new ball physics simulation"""
    try:
        ball_id = data.get('ballId')
        start_x = data.get('startX', BOARD_WIDTH / 2)
        
        print(f'Starting physics for ball {ball_id} at x={start_x}')
        
        # Create new ball
        ball = Ball(start_x, ball_id)
        pegs = ball.get_pegs()
        
        # Store ball state
        active_balls[sid] = {
            'ball': ball,
            'pegs': pegs,
            'task': None
        }
        
        # Start simulation task
        task = asyncio.create_task(simulate_ball(sid, ball_id))
        active_balls[sid]['task'] = task
        
    except Exception as e:
        print(f'Error starting physics: {e}')
        await sio.emit('physics_error', {'error': str(e)}, room=sid)


async def simulate_ball(sid: str, ball_id: str):
    """Simulate ball physics and emit position updates"""
    try:
        if sid not in active_balls:
            return
        
        ball = active_balls[sid]['ball']
        pegs = active_balls[sid]['pegs']
        
        frame_count = 0
        max_frames = FPS * 10  # Max 10 seconds
        
        print(f'🚀 Starting simulation for {ball_id} at ({ball.x}, {ball.y})')
        
        while not ball.finished and frame_count < max_frames:
            # Update physics
            position = ball.update(pegs)
            
            if position:
                # Emit position update to client
                await sio.emit('physics_update', {
                    'ballId': ball_id,
                    'position': position
                }, room=sid)
                
                # Debug: Log every 30 frames (every 0.5 seconds at 60fps)
                if frame_count % 30 == 0:
                    print(f'📍 Frame {frame_count}: Ball at ({ball.x:.1f}, {ball.y:.1f}), vy={ball.vy:.2f}')
            
            # Wait for next frame
            await asyncio.sleep(FRAME_TIME / 1000)
            frame_count += 1
        
        if frame_count >= max_frames:
            print(f'⏰ Simulation timeout for {ball_id} at frame {frame_count}')
        
        # Emit final result
        if ball.finished:
            complete_data = {
                'ballId': ball_id,
                'multiplier': ball.multiplier,
                'finalX': ball.x,
                'finalY': ball.y
            }
            print(f'📤 Emitting physics_complete to {sid}: {complete_data}')
            await sio.emit('physics_complete', complete_data, room=sid)
            print(f'✅ physics_complete emitted successfully')
        
        # Clean up
        if sid in active_balls:
            del active_balls[sid]
            
    except Exception as e:
        print(f'Error in simulation: {e}')
        await sio.emit('physics_error', {'error': str(e)}, room=sid)


@app.get("/")
async def root():
    return {"status": "Plinko Physics Server Running"}


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "active_simulations": len(active_balls)
    }


if __name__ == "__main__":
    print("Starting Plinko Physics Server on port 8000...")
    uvicorn.run(
        "main:socket_app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
