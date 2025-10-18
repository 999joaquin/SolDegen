import { io } from 'socket.io-client';

const API = (process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000').replace(/\/$/, '');

export const crashSocket = io(`${API}/crash`, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

if (typeof window !== 'undefined') {
  (window as any).crashSocket = crashSocket;
}