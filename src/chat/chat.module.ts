import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { ChatService } from './chats.service';
import { SessionService } from '../session/session.service';
import { ChatController } from './chat.controller';
import { UserService } from '../user';

@Module({
  providers: [EventsGateway, ChatService, SessionService, UserService],
  controllers: [ChatController],
})
export class ChatModule {}
