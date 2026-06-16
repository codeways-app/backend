import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ChatMapper } from '../chat/chat.mapper';
import { UserService } from '../user';
import { SessionService } from '../session/session.service';

import { ManticoreClient } from './manticore.client';
import { SearchIndexer } from './search.indexer';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [PrismaModule],
  providers: [
    ManticoreClient,
    SearchIndexer,
    SearchService,
    ChatMapper,
    UserService,
    SessionService,
  ],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
