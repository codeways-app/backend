import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from './ws-jwt/ws-jwt.guard';
import { SocketAuthMiddleware } from './ws-jwt/ws.mw';
import { SessionService } from '../session/session.service';
import type { AuthenticatedSocket } from './types/ws.types';
import { EventsService } from './events.service';

@UseGuards(WsJwtGuard)
@WebSocketGateway(3001, {})
export class EventsGateway {
  constructor(
    private readonly sessionService: SessionService,
    private readonly eventsService: EventsService,
  ) {}

  @WebSocketServer() server: Server;

  afterInit(server: Server) {
    server.use(SocketAuthMiddleware(this.sessionService));
  }
  // USER CONNECTION
  handleConnection(client: AuthenticatedSocket) {
    console.log(
      'New Websocket connection:',
      '\n id:',
      client.id,
      '\n user:',
      client.data.user.login,
    );
  }

  // USER DISCONNECTION
  handleDisconnect(client: Socket) {
    console.log('Websocket disconnected:', client.id);
  }

  // JOIN ROOM
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: AuthenticatedSocket, room: string) {
    console.log(room);
    const member = await this.eventsService.findMember(
      room,
      client.data.user.sub,
    );

    if (!member) {
      console.log('Access denied: not a chat member');
      throw new WsException('Access denied: not a chat member');
    }

    console.log(
      'User joined room:',
      '\n user:',
      client.data.user.login,
      '\n room:',
      room,
    );
    await client.join(room);
  }
}
