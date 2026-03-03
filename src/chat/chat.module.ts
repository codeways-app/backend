import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { ChatService } from './chat.service';
import { SessionService } from '../session/session.service';
import { ChatController } from './chat.controller';
import { UserService } from '../user';
import { ChatMapper } from './chat.mapper';

@Module({
  providers: [
    EventsGateway,
    ChatService,
    SessionService,
    UserService,
    ChatMapper,
  ],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
