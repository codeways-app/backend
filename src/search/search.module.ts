import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ChatMapper } from '../chat/chat.mapper';
import { UserService } from '../user';
import { SessionService } from '../session/session.service';

import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [PrismaModule],
  providers: [SearchService, ChatMapper, UserService, SessionService],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
