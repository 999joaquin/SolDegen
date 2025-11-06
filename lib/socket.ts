import { io } from 'socket.io-client';

const API = (process.env.NEXT_PUBLIC_API_BASE ?? '').replace(/\/$/, '');

// Detect if we're in production (deployed)
const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';

export const socket = io(`${API}/plinko`, {
  path: '/socket.io',
  // CRITICAL: Use polling-only in production for AWS App Runner compatibility
  // WebSocket upgrade fails on some cloud platforms, but polling works reliably
  transports: isProduction ? ['polling'] : ['polling', 'websocket'],
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
  // Add timeout untuk production
  timeout: 20000,
  // Force new connection untuk multiplayer
  forceNew: false,
  // Multiplex connections
  multiplex: true
});