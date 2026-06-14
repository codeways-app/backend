import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';
import { ChatMapper } from '../chat/chat.mapper';
import { CHAT_INCLUDE, MESSAGE_INCLUDE } from '../chat/shared/constants';
import type { ChatItemResponseDto } from '../chat/shared/dto';

interface ManticoreSqlResult {
  columns?: Array<Record<string, { type: string }>>;
  data?: Array<Record<string, string>>;
  total?: number;
  error?: string;
  warning?: string;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private sqlUrl: string;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly chatMapper: ChatMapper,
  ) {}

  async onModuleInit() {
    const host = this.configService.get<string>('MANTICORE_HOST', '127.0.0.1');
    const port = this.configService.get<string>('MANTICORE_HTTP_PORT', '9308');
    this.sqlUrl = `http://${host}:${port}/sql?mode=raw`;

    await this.ensureTable();
    await this.reindexAll();
  }

  // Manticore HTTP /sql endpoint expects raw SQL text in the request body
  private async run(sql: string): Promise<Array<Record<string, string>>> {
    const response = await fetch(this.sqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: sql,
    });

    const [result] = (await response.json()) as ManticoreSqlResult[];
    if (result?.error) {
      throw new Error(result.error);
    }
    return result?.data ?? [];
  }

  // Escape a string value for safe inline interpolation into Manticore SQL
  private esc(value: string): string {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }

  // Strip everything except letters, digits and whitespace, so the query
  // can't contain any of Manticore's extended query syntax characters
  private normalizeWord(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Wrap each word in infix wildcards so substrings (e.g. "про") match
  // longer words (e.g. "проверим"), enabled by min_infix_len on the table.
  // A query wrapped in "double quotes" instead becomes a phrase search,
  // matching only messages where the words appear adjacent and in that order.
  private buildMatchQuery(query: string): string {
    const trimmed = query.trim();
    if (
      trimmed.length > 2 &&
      trimmed.startsWith('"') &&
      trimmed.endsWith('"')
    ) {
      const phrase = this.normalizeWord(trimmed.slice(1, -1));
      return phrase ? `"${phrase}"` : '';
    }

    return this.normalizeWord(trimmed)
      .split(' ')
      .filter(Boolean)
      .map((term) => `*${term}*`)
      .join(' ');
  }

  public async ensureTable(): Promise<void> {
    try {
      await this.run('DROP TABLE IF EXISTS messages_search');
      await this.run(
        'CREATE TABLE messages_search (message_id string, chat_id string, content text) ' +
          "morphology='stem_en,stem_ru' " +
          "min_infix_len='2' " +
          "charset_table='0..9, A..Z->a..z, a..z, U+410..U+42F->U+430..U+44F, U+430..U+44F, U+401->U+451, U+451'",
      );
      this.logger.log('Manticore table ready');
    } catch (err) {
      this.logger.error('Failed to create Manticore table', err);
    }
  }

  public async reindexAll(): Promise<void> {
    try {
      const messages = await this.prismaService.message.findMany({
        select: { id: true, chatId: true, content: true },
      });
      for (const msg of messages) {
        await this.indexMessageRaw(msg.id, msg.chatId, msg.content);
      }
      this.logger.log(`Indexed ${messages.length} messages into Manticore`);
    } catch (err) {
      this.logger.error('Manticore reindex failed', err);
    }
  }

  private async indexMessageRaw(
    messageId: string,
    chatId: string,
    content: string,
  ): Promise<void> {
    await this.run(
      `INSERT INTO messages_search (message_id, chat_id, content) VALUES (${this.esc(messageId)}, ${this.esc(chatId)}, ${this.esc(content)})`,
    );
  }

  public async indexMessage(
    messageId: string,
    chatId: string,
    content: string,
  ): Promise<void> {
    if (!this.sqlUrl) return;
    try {
      await this.indexMessageRaw(messageId, chatId, content);
    } catch (err) {
      this.logger.warn(`Failed to index message ${messageId}`, err);
    }
  }

  public async search(
    query: string,
    userId: string,
  ): Promise<ChatItemResponseDto[]> {
    const members = await this.prismaService.chatMember.findMany({
      where: { userId },
      select: { chatId: true },
    });
    const userChatIds = [...new Set(members.map((m) => m.chatId))];
    if (userChatIds.length === 0) return [];

    // Full-text search in Manticore — keep the best-ranked matching message per chat
    const matchQuery = this.buildMatchQuery(query);
    const rows = matchQuery
      ? await this.run(
          `SELECT message_id, chat_id FROM messages_search WHERE MATCH(${this.esc(matchQuery)}) LIMIT 50`,
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

    // Search chat titles in PostgreSQL
    const fromTitle = await this.prismaService.chat.findMany({
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
      this.prismaService.chat.findMany({
        where: { id: { in: matchingIds } },
        include: CHAT_INCLUDE(),
      }),
      this.prismaService.message.findMany({
        where: { id: { in: [...matchedMessageIdByChatId.values()] } },
        include: MESSAGE_INCLUDE(),
      }),
    ]);

    const matchedMessageById = new Map(matchedMessages.map((m) => [m.id, m]));

    return Promise.all(
      chats.map(async (chat) => {
        const member = chat.members.find((m) => m.userId === userId);
        const unreadCount = await this.prismaService.message.count({
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
