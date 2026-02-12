import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from './ws-jwt/ws-jwt.guard';
import { SocketAuthMiddleware } from './ws-jwt/ws.mw';
import { SessionService } from '../session/session.service';
import { AuthenticatedSocket } from './types/ws.types';

@UseGuards(WsJwtGuard)
@WebSocketGateway(3001, {})
export class EventsGateway {
  constructor(private readonly sessionService: SessionService) {}

  @WebSocketServer() server: Server;

  afterInit(server: Server) {
    server.use(SocketAuthMiddleware(this.sessionService));
  }
  // USER CONNECTION
  handleConnection(client: AuthenticatedSocket) {
    console.log(
      'User joined:',
      '\n id:',
      client.id,
      '\n user:',
      client.data.user,
    );

    this.server
      .to('chat')
      .emit('user-joined', `New User joined the chat: ${client.id}`);
  }

  // USER DISCONNECTION
  handleDisconnect(client: Socket) {
    console.log('User left:', client.id);

    this.server.emit('user-left', `User left the chat: ${client.id}`);
  }

  // NEW MESSAGE
  @SubscribeMessage('newMessage')
  handleMessage(client: Socket, message: any) {
    console.log(client.id, message);
    client.emit('reply', 'delivered');

    this.server.emit('broadcasting', 'broadcasting...');
  }
}
