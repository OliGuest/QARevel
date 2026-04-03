import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

const MAX_SUBSCRIPTIONS_PER_CLIENT = 20;
const CHANNEL_PATTERN = /^(test-run|device|recording):[a-f0-9-]+$/;

@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private readonly clientSubscriptions = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.query.token as string) ||
        client.handshake.auth?.token;

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      (client as any).user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      this.clientSubscriptions.set(client.id, new Set());

      this.logger.log(`Client ${client.id} connected (user: ${payload.email || payload.sub})`);
    } catch (error) {
      this.logger.warn(`Client ${client.id} auth failed: ${(error as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.clientSubscriptions.delete(client.id);
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channel: string },
  ) {
    if (!data.channel || !CHANNEL_PATTERN.test(data.channel)) {
      return { event: 'error', data: { message: 'Invalid channel format' } };
    }

    const subs = this.clientSubscriptions.get(client.id);
    if (subs && subs.size >= MAX_SUBSCRIPTIONS_PER_CLIENT) {
      return { event: 'error', data: { message: 'Too many subscriptions' } };
    }

    client.join(data.channel);
    subs?.add(data.channel);
    this.logger.debug(`Client ${client.id} subscribed to ${data.channel}`);
    return { event: 'subscribed', data: { channel: data.channel } };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channel: string },
  ) {
    if (data.channel) {
      client.leave(data.channel);
      this.clientSubscriptions.get(client.id)?.delete(data.channel);
      this.logger.debug(`Client ${client.id} unsubscribed from ${data.channel}`);
      return { event: 'unsubscribed', data: { channel: data.channel } };
    }
  }

  emitToTestRun(testRunId: string, event: string, data: unknown) {
    this.server.to(`test-run:${testRunId}`).emit(event, data);
  }

  emitToDevice(deviceId: string, event: string, data: unknown) {
    this.server.to(`device:${deviceId}`).emit(event, data);
  }

  broadcast(event: string, data: unknown) {
    this.server.emit(event, data);
  }
}
