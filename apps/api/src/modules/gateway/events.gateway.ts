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
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

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

      this.logger.log(`Client ${client.id} connected (user: ${payload.email || payload.sub})`);
    } catch (error) {
      this.logger.warn(`Client ${client.id} auth failed: ${(error as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channel: string },
  ) {
    if (data.channel) {
      client.join(data.channel);
      this.logger.debug(`Client ${client.id} subscribed to ${data.channel}`);
      return { event: 'subscribed', data: { channel: data.channel } };
    }
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channel: string },
  ) {
    if (data.channel) {
      client.leave(data.channel);
      this.logger.debug(`Client ${client.id} unsubscribed from ${data.channel}`);
      return { event: 'unsubscribed', data: { channel: data.channel } };
    }
  }

  /** Emit an event to a specific test-run channel */
  emitToTestRun(testRunId: string, event: string, data: unknown) {
    this.server.to(`test-run:${testRunId}`).emit(event, data);
  }

  /** Emit an event to a specific device channel */
  emitToDevice(deviceId: string, event: string, data: unknown) {
    this.server.to(`device:${deviceId}`).emit(event, data);
  }

  /** Broadcast to all connected clients */
  broadcast(event: string, data: unknown) {
    this.server.emit(event, data);
  }
}
