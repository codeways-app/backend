import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { SearchService } from './search.service';
import { ChatMapper } from '../chat/chat.mapper';
import { PrismaService } from '../prisma/prisma.service';
import { ChatType, ContentType } from '../../generated/prisma';

describe('SearchService', () => {
  let service: SearchService;
  let fetchSpy: jest.SpiedFunction<typeof global.fetch>;

  const prisma = {
    chatMember: { findMany: jest.fn() },
    chat: { findMany: jest.fn() },
    message: { findMany: jest.fn(), count: jest.fn() },
  };
  const configService = { get: jest.fn() };

  const userId = 'user-me';
  const chatId = 'chat-1';

  const buildUser = (id: string) => ({
    id,
    login: `login-${id}`,
    name: null,
    picture: null,
  });

  const manticoreResponse = (data: Array<Record<string, string>>) => ({
    json: () => Promise.resolve([{ data }]),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    fetchSpy = jest.spyOn(global, 'fetch') as jest.SpiedFunction<
      typeof global.fetch
    >;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        ChatMapper,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(SearchService);
    // Set the Manticore SQL URL without running the full onModuleInit (ensureTable/reindexAll)
    (service as unknown as { sqlUrl: string }).sqlUrl =
      'http://127.0.0.1:9308/sql?mode=raw';
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('search', () => {
    it('returns an empty array when the user has no chats', async () => {
      prisma.chatMember.findMany.mockResolvedValue([]);

      const result = await service.search('hello', userId);

      expect(result).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns an empty array when nothing matches by content or title', async () => {
      prisma.chatMember.findMany.mockResolvedValue([{ chatId }]);
      fetchSpy.mockResolvedValue(manticoreResponse([]) as unknown as Response);
      prisma.chat.findMany.mockResolvedValueOnce([]); // title search

      const result = await service.search('nothing', userId);

      expect(result).toEqual([]);
    });

    it('finds chats by full-text match and attaches the matched message', async () => {
      const messageCreatedAt = new Date('2024-01-02T00:00:00Z');

      prisma.chatMember.findMany.mockResolvedValue([{ chatId }]);
      fetchSpy.mockResolvedValue(
        manticoreResponse([
          { message_id: 'message-1', chat_id: chatId },
        ]) as unknown as Response,
      );
      prisma.chat.findMany.mockResolvedValueOnce([]); // title search finds nothing

      prisma.chat.findMany.mockResolvedValueOnce([
        {
          id: chatId,
          type: ChatType.PRIVATE,
          title: 'Chat',
          picture: null,
          createdAt: messageCreatedAt,
          updatedAt: messageCreatedAt,
          members: [
            {
              id: 'member-me',
              chatId,
              userId,
              lastReadAt: new Date('2024-01-01T00:00:00Z'),
              createdAt: new Date('2024-01-01T00:00:00Z'),
              updatedAt: new Date('2024-01-01T00:00:00Z'),
              user: buildUser(userId),
            },
            {
              id: 'member-other',
              chatId,
              userId: 'user-other',
              lastReadAt: new Date('2024-01-01T00:00:00Z'),
              createdAt: new Date('2024-01-01T00:00:00Z'),
              updatedAt: new Date('2024-01-01T00:00:00Z'),
              user: buildUser('user-other'),
            },
          ],
          messages: [],
        },
      ]);

      prisma.message.findMany.mockResolvedValue([
        {
          id: 'message-1',
          content: 'hello world',
          type: ContentType.TEXT,
          createdAt: messageCreatedAt,
          updatedAt: messageCreatedAt,
          replyToId: null,
          fileName: null,
          fileSize: null,
          mimeType: null,
          sender: buildUser('user-other'),
        },
      ]);
      prisma.message.count.mockResolvedValue(1);

      const result = await service.search('hello', userId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(chatId);
      expect(result[0].unreadCount).toBe(1);
      expect(result[0].lastMessage?.id).toBe('message-1');
      expect(result[0].lastMessage?.content).toBe('hello world');

      // The match query is wrapped in infix wildcards
      const matchSql = fetchSpy.mock.calls[0][1]?.body as string;
      expect(matchSql).toContain('*hello*');
    });

    it('finds chats by title even when nothing matches in Manticore', async () => {
      prisma.chatMember.findMany.mockResolvedValue([{ chatId }]);
      fetchSpy.mockResolvedValue(manticoreResponse([]) as unknown as Response);
      prisma.chat.findMany.mockResolvedValueOnce([{ id: chatId }]); // title search match

      prisma.chat.findMany.mockResolvedValueOnce([
        {
          id: chatId,
          type: ChatType.GROUP,
          title: 'Project Discussion',
          picture: null,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
          members: [
            {
              id: 'member-me',
              chatId,
              userId,
              lastReadAt: new Date('2024-01-01T00:00:00Z'),
              createdAt: new Date('2024-01-01T00:00:00Z'),
              updatedAt: new Date('2024-01-01T00:00:00Z'),
              user: buildUser(userId),
            },
          ],
          messages: [],
        },
      ]);
      prisma.message.findMany.mockResolvedValue([]);
      prisma.message.count.mockResolvedValue(0);

      const result = await service.search('Project', userId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(chatId);
      expect(result[0].title).toBe('Project Discussion');
      expect(result[0].lastMessage).toBeUndefined();
    });

    it('builds a phrase match query for quoted search terms', async () => {
      prisma.chatMember.findMany.mockResolvedValue([{ chatId }]);
      fetchSpy.mockResolvedValue(manticoreResponse([]) as unknown as Response);
      prisma.chat.findMany.mockResolvedValueOnce([]);

      await service.search('"hello world"', userId);

      const matchSql = fetchSpy.mock.calls[0][1]?.body as string;
      expect(matchSql).toContain('"hello world"');
      expect(matchSql).not.toContain('*hello*');
    });
  });

  describe('indexMessage', () => {
    it('does nothing if the Manticore SQL URL has not been initialized yet', async () => {
      (service as unknown as { sqlUrl: string }).sqlUrl = '';

      await service.indexMessage('message-1', chatId, 'hello');

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('sends an INSERT statement with the message content', async () => {
      fetchSpy.mockResolvedValue(manticoreResponse([]) as unknown as Response);

      await service.indexMessage('message-1', chatId, 'hello world');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const sql = fetchSpy.mock.calls[0][1]?.body as string;
      expect(sql).toContain('INSERT INTO messages_search');
      expect(sql).toContain('message-1');
      expect(sql).toContain(chatId);
      expect(sql).toContain('hello world');
    });

    it('swallows errors from Manticore without throwing', async () => {
      fetchSpy.mockRejectedValue(new Error('connection refused'));

      await expect(
        service.indexMessage('message-1', chatId, 'hello'),
      ).resolves.toBeUndefined();
    });
  });
});
