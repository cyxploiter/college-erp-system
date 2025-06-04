
import { io, Socket } from 'socket.io-client';
import { RealtimeMessagePayload } from '@college-erp/common';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'; // From backend

let socket: Socket | null = null;

interface SocketConnectionOptions {
  onConnect?: () => void;
  onDisconnect?: (reason: Socket.DisconnectReason) => void;
  onConnectError?: (error: Error) => void;
  onMessageReceived?: (message: RealtimeMessagePayload) => void;
}

export const getSocket = (): Socket | null => {
    return socket;
};

export const connectSocket = (token: string | null, options?: SocketConnectionOptions): Socket => {
  if (socket && socket.connected) {
    // If already connected and token hasn't changed, return existing socket
    // This simple check might need more robust logic if token can change during session
    if (socket.auth && (socket.auth as {token: string}).token === token) {
        return socket;
    }
    // If token changed or other reasons, disconnect old one first
    socket.disconnect();
  }

  console.log("Attempting to connect WebSocket with token:", !!token);
  socket = io(SOCKET_URL, {
    reconnectionAttempts: 5,
    reconnectionDelay: 3000,
    auth: { token }, // Send token for authentication
    autoConnect: true, // Explicitly true, though default
  });

  socket.on('connect', () => {
    console.log('WebSocket connected successfully. Socket ID:', socket?.id);
    if (options?.onConnect) options.onConnect();

    // Example: Join a user-specific room upon connection if needed, handled by backend too
    // if (user) socket.emit('join:room', `user:${user.id}`);
  });

  socket.on('disconnect', (reason) => {
    console.warn('WebSocket disconnected. Reason:', reason);
    if (options?.onDisconnect) options.onDisconnect(reason);
    if (reason === 'io server disconnect') {
      // The server explicitly disconnected the socket (e.g., auth failure after connection)
      // Potentially clear socket instance or handle re-auth
      socket?.connect(); // This might be too aggressive, consider app logic
    }
    // else the socket will automatically try to reconnect if not intentional
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error.message, error.cause);
    if (options?.onConnectError) options.onConnectError(error);
    // Example: if auth error, maybe prompt logout or token refresh
    // if (error.message.includes("Authentication error")) { ... }
  });

  // Standard message handler
  socket.on('receive:message', (message: RealtimeMessagePayload) => {
    console.log('WebSocket message received:', message);
    if (options?.onMessageReceived) options.onMessageReceived(message);
  });

  // Clean up previous listeners if any (important for HMR in dev)
  // This is a simplified cleanup. More robust would be to track listeners.
  if (socket && socket.listeners('receive:message').length > 1) {
      socket.off('receive:message');
      socket.on('receive:message', (message: RealtimeMessagePayload) => {
        if (options?.onMessageReceived) options.onMessageReceived(message);
      });
  }
  

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    console.log('Disconnecting WebSocket manually.');
    socket.disconnect();
    socket = null;
  }
};

// You can add more specific event emitters here if clients need to send data
// export const sendMessageViaSocket = (event: string, data: unknown) => {
//   if (socket && socket.connected) {
//     socket.emit(event, data);
//   } else {
//     console.warn('Socket not connected. Cannot send message via socket.');
//   }
// };
