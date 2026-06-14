import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';

import { SessionService } from '../session/session.service';

import { chatFilesMulterOptions } from './shared/utils';

import { UserService } from '../user';
import { SearchModule } from '../search';

import { EventsGateway } from './events.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatMapper } from './chat.mapper';

@Module({
  imports: [SearchModule, MulterModule.register(chatFilesMulterOptions)],
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
