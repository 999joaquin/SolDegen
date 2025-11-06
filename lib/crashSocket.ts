import { io } from 'socket.io-client';

const API = (process.env.NEXT_PUBLIC_API_BASE ?? '').replace(/\/$/, '');

// Detect if we're in production (deployed)
const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';

export const crashSocket = io(`${API}/crash`, {
  path: '/socket.io',
  // CRITICAL: Use polling-only in production for AWS App Runner compatibility
  transports: isProduction ? ['polling'] : ['polling', 'websocket'],
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
  timeout: 20000,
  forceNew: false,
  multiplex: true
});

if (typeof window !== 'undefined') {
  (window as any).crashSocket = crashSocket;
}