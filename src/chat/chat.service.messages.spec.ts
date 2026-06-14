import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ChatService } from './chat.service';
import { ChatMapper } from './chat.mapper';
import { EventsGateway } from './events.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search';
import {
  ChatType,
  ContentType,
  MessageStatusType,
} from '../../generated/prisma';

describe('ChatService - messages & read status', () => {
  let service: ChatService;

  const prisma = {
    chatMember: { findFirst: jest.fn(), updateMany: jest.fn() },
    chat: { findMany: jest.fn(), findFirst: jest.fn() },
    message: { create: jest.fn(), count: jest.fn() },
  };
  const eventsGateway = { emitMessage: jest.fn() };
  const searchService = {
    indexMessage: jest.fn().mockResolvedValue(undefined),
  };

  const chatId = 'chat-1';
  const userId = 'user-me';
  const otherUserId = 'user-other';

  beforeEach(async () => {
    jest.clearAllMocks();
    searchService.indexMessage.mockResolvedValue(undefined);
    prisma.chatMember.updateMany.mockResolvedValue({ count: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        ChatMapper,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsGateway, useValue: eventsGateway },
        { provide: SearchService, useValue: searchService },
      ],
    }).compile();

    service = module.get(ChatService);
  });

  const buildUser = (id: string) => ({
    id,
    login: `login-${id}`,
    name: null,
    picture: null,
  });

  describe('markMessagesAsRead', () => {
    it('updates the current user own read cursor for the chat', async () => {
      await service.markMessagesAsRead(chatId, userId);

      expect(prisma.chatMember.updateMany).toHaveBeenCalledWith({
        where: { chatId, userId },
        data: { lastReadAt: expect.any(Date) },
      });
    });
  });

  describe('createMessage', () => {
    it('throws if the user is not a chat member', async () => {
      prisma.chatMember.findFirst.mockResolvedValue(null);

      await expect(
        service.createMessage(chatId, userId, {
          content: 'hi',
          type: ContentType.TEXT,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.message.create).not.toHaveBeenCalled();
    });

    it('creates the message, broadcasts it, advances the read cursor and indexes it for search', async () => {
      prisma.chatMember.findFirst.mockResolvedValue({ id: 'member-id' });

      const createdAt = new Date('2024-01-02T00:00:00Z');
      prisma.message.create.mockResolvedValue({
        id: 'message-1',
        content: 'hi',
        type: ContentType.TEXT,
        createdAt,
        updatedAt: createdAt,
        replyToId: null,
        fileName: null,
        fileSize: null,
        mimeType: null,
        sender: buildUser(userId),
      });

      const result = await service.createMessage(chatId, userId, {
        content: 'hi',
        type: ContentType.TEXT,
      });

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          chatId,
          senderId: userId,
          content: 'hi',
          type: ContentType.TEXT,
        },
        include: expect.anything(),
      });

      expect(result.content).toBe('hi');
      expect(result.status).toBe(MessageStatusType.DELIVERED);

      expect(eventsGateway.emitMessage).toHaveBeenCalledWith(chatId, result);

      expect(prisma.chatMember.updateMany).toHaveBeenCalledWith({
        where: { chatId, userId },
        data: { lastReadAt: expect.any(Date) },
      });

      expect(searchService.indexMessage).toHaveBeenCalledWith(
        'message-1',
        chatId,
        'hi',
      );
    });
  });

  describe('getUserChats - unread counts', () => {
    it('counts only messages from other members created after my last-read cursor', async () => {
      const lastReadAt = new Date('2024-01-01T00:00:00Z');
      const messageCreatedAt = new Date('2024-01-02T00:00:00Z');

      prisma.chat.findMany.mockResolvedValue([
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
              lastReadAt,
              createdAt: lastReadAt,
              updatedAt: lastReadAt,
              user: buildUser(userId),
            },
            {
              id: 'member-other',
              chatId,
              userId: otherUserId,
              lastReadAt: messageCreatedAt,
              createdAt: lastReadAt,
              updatedAt: lastReadAt,
              user: buildUser(otherUserId),
            },
          ],
          messages: [
            {
              id: 'message-1',
              content: 'hello',
              type: ContentType.TEXT,
              createdAt: messageCreatedAt,
              updatedAt: messageCreatedAt,
              replyToId: null,
              fileName: null,
              fileSize: null,
              mimeType: null,
              sender: buildUser(otherUserId),
            },
          ],
        },
      ]);
      prisma.message.count.mockResolvedValue(2);

      const chats = await service.getUserChats(userId);

      expect(prisma.message.count).toHaveBeenCalledWith({
        where: {
          chatId,
          senderId: { not: userId },
          createdAt: { gt: lastReadAt },
        },
      });
      expect(chats[0].unreadCount).toBe(2);
    });
  });

  describe('getChatWithMessages - group read status', () => {
    const buildGroupChat = (
      memberBLastReadAt: Date,
      memberCLastReadAt: Date,
    ) => ({
      id: chatId,
      type: ChatType.GROUP,
      title: 'Group',
      picture: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      members: [
        {
          id: 'member-me',
          chatId,
          userId,
          lastReadAt: new Date('2024-01-03T00:00:00Z'),
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
          user: buildUser(userId),
        },
        {
          id: 'member-b',
          chatId,
          userId: 'user-b',
          lastReadAt: memberBLastReadAt,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
          user: buildUser('user-b'),
        },
        {
          id: 'member-c',
          chatId,
          userId: 'user-c',
          lastReadAt: memberCLastReadAt,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
          user: buildUser('user-c'),
        },
      ],
      messages: [
        {
          id: 'message-1',
          content: 'hi team',
          type: ContentType.TEXT,
          createdAt: new Date('2024-01-02T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z'),
          replyToId: null,
          fileName: null,
          fileSize: null,
          mimeType: null,
          sender: buildUser(userId),
        },
      ],
    });

    it('marks my own message as DELIVERED while at least one member has not read it', async () => {
      prisma.chat.findFirst.mockResolvedValue(
        buildGroupChat(
          new Date('2024-01-02T00:00:00Z'),
          new Date('2024-01-01T12:00:00Z'),
        ),
      );

      const result = await service.getChatWithMessages(chatId, userId);

      expect(result.messages[0].status).toBe(MessageStatusType.DELIVERED);
    });

    it('marks my own message as READ once every other member has read up to it', async () => {
      prisma.chat.findFirst.mockResolvedValue(
        buildGroupChat(
          new Date('2024-01-02T00:00:00Z'),
          new Date('2024-01-02T00:00:00Z'),
        ),
      );

      const result = await service.getChatWithMessages(chatId, userId);

      expect(result.messages[0].status).toBe(MessageStatusType.READ);
    });
  });
});
