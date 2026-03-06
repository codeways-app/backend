import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

import { WsJwtGuard, SocketAuthMiddleware } from './shared/guards';
import type { AuthenticatedSocket } from './shared/types';
import { MessageResponseDto } from './shared/dto';

import { SessionService } from '../session/session.service';

import { ChatService } from './chat.service';

@UseGuards(WsJwtGuard)
@WebSocketGateway(3001, {})
export class EventsGateway {
  private readonly logger: Logger = new Logger(EventsGateway.name);
  constructor(
    private readonly sessionService: SessionService,
    private readonly chatService: ChatService,
  ) {}

  @WebSocketServer() server: Server;

  afterInit(server: Server) {
    server.use(SocketAuthMiddleware(this.sessionService));
  }
  handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`New Websocket connection: ${client.data.user.login}`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.error(`Websocket disconnected: ${client.data.user.login}`);
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: AuthenticatedSocket, room: string) {
    const isMember = await this.chatService.isChatMember(
      room,
      client.data.user.sub,
    );

    if (!isMember) {
      throw new WsException('Access denied: not a chat member');
    }

    await client.join(room);

    client.to(room).emit('broadcasting', room);
  }

  emitMessage(chatId: string, message: MessageResponseDto) {
    this.server.to(chatId).emit('newMessage', message);
  }
}
