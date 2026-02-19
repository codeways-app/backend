import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from './shared/guards/ws-jwt.guard';
import { SocketAuthMiddleware } from './shared/guards/ws.mw';
import type { AuthenticatedSocket } from './shared/types/ws.types';
import { SessionService } from '../session/session.service';
import { ChatService } from './chat.service';

@UseGuards(WsJwtGuard)
@WebSocketGateway(3001, {})
export class EventsGateway {
  constructor(
    private readonly sessionService: SessionService,
    private readonly chatService: ChatService,
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
    const isMember = await this.chatService.isChatMember(
      room,
      client.data.user.sub,
    );

    if (!isMember) {
      console.log('Access denied: not a chat member');
      throw new WsException('Access denied: not a chat member');
    }

    await client.join(room);

    console.log(
      'User joined room:',
      '\n user:',
      client.data.user.login,
      '\n room:',
      room,
    );

    client.to(room).emit('broadcasting', room);
  }
}
