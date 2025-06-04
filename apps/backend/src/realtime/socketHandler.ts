
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import logger from '@/utils/logger';
import { verifyToken } from '@/utils/jwt';
import { UserPayload, RealtimeMessagePayload } from '@college-erp/common';

// Store io instance to be accessible from controllers
let io: SocketIOServer | null = null;

export const getIoInstance = () => io;

export const initSocketIO = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000", // Configure this for your frontend URL
      methods: ["GET", "POST"]
    }
  });

  // Socket.IO Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
      const user = verifyToken(token);
      if (user) {
        (socket as any).user = user; // Attach user to socket object
        logger.info(`Socket authenticated for user: ${user.username} (ID: ${user.id}) - Socket ID: ${socket.id}`);
        return next();
      }
    }
    logger.warn(`Socket authentication failed for socket ID: ${socket.id}`);
    return next(new Error('Authentication error: Invalid token.'));
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as UserPayload | undefined;
    if (!user) {
      logger.error(`User somehow undefined on socket connection after auth middleware for socket ID: ${socket.id}. Disconnecting.`);
      socket.disconnect(true);
      return;
    }

    logger.info(`User ${user.username} (Socket ID: ${socket.id}) connected.`);

    // Join a room specific to the user ID for direct messages
    socket.join(`user:${user.id}`);
    logger.info(`User ${user.username} (Socket ID: ${socket.id}) joined room user:${user.id}`);
    
    // Example: Send a welcome message to the connected client
    const welcomeMessage: RealtimeMessagePayload = {
        id: `welcome-${socket.id}`,
        content: `Welcome, ${user.username}! You are connected to the real-time notification service.`,
        timestamp: new Date().toISOString(),
        priority: 'Normal',
        type: 'SystemInfo',
        title: 'Connection Established'
    };
    socket.emit('receive:message', welcomeMessage);


    // Handle custom events from client
    // Example: Client explicitly requests to join a specific room (e.g., for a course or group chat)
    socket.on('join:room', (roomName: string) => {
      if(typeof roomName === 'string' && roomName.length > 0) {
        socket.join(roomName);
        logger.info(`User ${user.username} (Socket ID: ${socket.id}) joined custom room: ${roomName}`);
        socket.emit('receive:message', {
            id: `join-${roomName}-${socket.id}`,
            content: `You have joined room: ${roomName}`,
            timestamp: new Date().toISOString(), priority: 'Normal', type: 'SystemInfo', title: 'Room Joined'
        } as RealtimeMessagePayload);
      } else {
        logger.warn(`User ${user.username} (Socket ID: ${socket.id}) attempted to join invalid room: ${roomName}`);
      }
    });

    socket.on('send:message', (message: RealtimeMessagePayload) => {
      // This is for client-to-client or client-to-group messages if needed.
      // For admin announcements, it's better to use the HTTP API to create a message,
      // which then triggers a server-side emit.
      // This example just broadcasts it back to other clients (excluding sender).
      logger.info(`User ${user.username} (Socket ID: ${socket.id}) sent a message via socket: ${message.content}`);
      socket.broadcast.emit('receive:message', { ...message, sender: user.username });
    });

    socket.on('disconnect', (reason) => {
      logger.info(`User ${user.username} (Socket ID: ${socket.id}) disconnected. Reason: ${reason}`);
    });
  });
  
  logger.info('Socket.IO server initialized and listening for connections.');
  return io;
};
