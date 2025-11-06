import { io, Socket } from 'socket.io-client';

let physicsSocket: Socket | null = null;

export const getPhysicsSocket = () => {
  if (!physicsSocket) {
    // Connect via Node proxy path so it works in AWS App Runner
    physicsSocket = io('/', {
      path: '/physics/socket.io',
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    physicsSocket.on('connect', () => {
      console.log('✅ Connected to Python Physics Backend');
    });

    physicsSocket.on('disconnect', () => {
      console.log('❌ Disconnected from Python Physics Backend');
    });

    physicsSocket.on('connect_error', (error) => {
      console.error('Physics Socket Connection Error:', error);
    });
  }

  return physicsSocket;
};

export const disconnectPhysicsSocket = () => {
  if (physicsSocket) {
    physicsSocket.disconnect();
    physicsSocket = null;
  }
};

// Types for physics events
export interface PhysicsPosition {
  x: number;
  y: number;
  finished: boolean;
}

export interface PhysicsUpdate {
  ballId: string;
  position: PhysicsPosition;
}

export interface PhysicsComplete {
  ballId: string;
  multiplier: number;
  finalX: number;
  finalY: number;
}

export interface StartPhysicsData {
  ballId: string;
  startX?: number;
}