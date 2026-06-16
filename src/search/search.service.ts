import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';
import { ChatMapper } from '../chat/chat.mapper';
import { CHAT_INCLUDE, MESSAGE_INCLUDE } from '../chat/shared/constants';
import type { ChatItemResponseDto } from '../chat/shared/dto';

import { ManticoreClient } from './manticore.client';
import { SearchIndexer } from './search.indexer';
import { SearchQueryBuilder } from './search-query.builder';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private readonly queryBuilder = new SearchQueryBuilder();

  constructor(
    private readonly client: ManticoreClient,
    private readonly indexer: SearchIndexer,
    private readonly prisma: PrismaService,
    private readonly chatMapper: ChatMapper,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const host = this.configService.get<string>('MANTICORE_HOST', '127.0.0.1');
    const port = this.configService.get<string>('MANTICORE_HTTP_PORT', '9308');
    this.client.init(host, port);

    if (await this.client.tryConnect()) {
      await this.indexer.ensureTable();
      await this.indexer.reindexAll();
    }
  }

  public async indexMessage(
    messageId: string,
    chatId: string,
    content: string,
  ): Promise<void> {
    return this.indexer.indexMessage(messageId, chatId, content);
  }

  public async search(query: string, userId: string): Promise<ChatItemResponseDto[]> {
    if (this.client.shouldRetry()) {
      if (await this.client.tryConnect()) {
        await this.indexer.ensureTable();
        await this.indexer.reindexAll();
      }
    }
    if (!this.client.available) return [];

    const members = await this.prisma.chatMember.findMany({
      where: { userId },
      select: { chatId: true },
    });
    const userChatIds = [...new Set(members.map((m) => m.chatId))];
    if (userChatIds.length === 0) return [];

    const matchQuery = this.queryBuilder.buildMatchQuery(query);
    const rows = matchQuery
      ? await this.client.run(
          `SELECT message_id, chat_id FROM messages_search WHERE MATCH(${this.client.esc(matchQuery)}) LIMIT 50`,
        )
      : [];

    const userChatIdSet = new Set(userChatIds);
    const matchedMessageIdByChatId = new Map<string, string>();
    for (const row of rows) {
      if (!userChatIdSet.has(row.chat_id)) continue;
      if (!matchedMessageIdByChatId.has(row.chat_id)) {
        matchedMessageIdByChatId.set(row.chat_id, row.message_id);
      }
    }

    const fromTitle = await this.prisma.chat.findMany({
      where: {
        id: { in: userChatIds },
        title: { contains: query, mode: 'insensitive' },
      },
      select: { id: true },
    });

    const matchingIds = [
      ...new Set([
        ...fromTitle.map((c) => c.id),
        ...matchedMessageIdByChatId.keys(),
      ]),
    ];
    if (matchingIds.length === 0) return [];

    const [chats, matchedMessages] = await Promise.all([
      this.prisma.chat.findMany({
        where: { id: { in: matchingIds } },
        include: CHAT_INCLUDE(),
      }),
      this.prisma.message.findMany({
        where: { id: { in: [...matchedMessageIdByChatId.values()] } },
        include: MESSAGE_INCLUDE(),
      }),
    ]);

    const matchedMessageById = new Map(matchedMessages.map((m) => [m.id, m]));

    return Promise.all(
      chats.map(async (chat) => {
        const member = chat.members.find((m) => m.userId === userId);
        const unreadCount = await this.prisma.message.count({
          where: {
            chatId: chat.id,
            senderId: { not: userId },
            createdAt: { gt: member?.lastReadAt ?? new Date(0) },
          },
        });

        const dto = this.chatMapper.toChatItemDto(chat, userId, unreadCount);
        const matchedMessage = matchedMessageById.get(
          matchedMessageIdByChatId.get(chat.id) ?? '',
        );
        if (matchedMessage) {
          dto.lastMessage = this.chatMapper.toMessageResponseDto(
            matchedMessage,
            userId,
            chat.id,
            chat.members,
          );
        }
        return dto;
      }),
    );
  }
}
