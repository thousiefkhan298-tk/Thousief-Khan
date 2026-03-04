import { io } from 'socket.io-client';

// Use polling to prevent "websocket closed without opened" errors behind strict proxies
export const socket = io(typeof window !== 'undefined' ? window.location.origin : '', {
  path: '/socket.io/',
  transports: ['polling'], // Force polling to avoid websocket upgrade failures
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 2000,
  timeout: 20000,
  autoConnect: true,
});

socket.on('connect', () => {
  console.log('[Socket] Connected:', socket.id);
});

socket.on('connect_error', (err) => {
  console.error('[Socket] Connection error:', err.message);
});

socket.on('disconnect', (reason) => {
  console.log('[Socket] Disconnected:', reason);
  if (reason === 'io server disconnect') {
    // the disconnection was initiated by the server, you need to reconnect manually
    socket.connect();
  }
});
