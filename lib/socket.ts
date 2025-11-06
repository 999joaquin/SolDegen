import { io } from 'socket.io-client';

const API = (process.env.NEXT_PUBLIC_API_BASE ?? '').replace(/\/$/, '');

export const socket = io(`${API}/plinko`, {
  path: '/socket.io',
  transports: ['polling', 'websocket'],
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});