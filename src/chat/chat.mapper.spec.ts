import { ChatMapper } from './chat.mapper';
import {
  ChatType,
  ContentType,
  MessageStatusType,
} from '../../generated/prisma';
import {
  ChatMemberBasicInfo,
  ChatWithMembersAndMessages,
  MessageWithSender,
} from './shared/types';

describe('ChatMapper - read status & unread counts', () => {
  let mapper: ChatMapper;

  const senderId = 'sender-id';
  const messageCreatedAt = new Date('2024-01-02T00:00:00Z');

  beforeEach(() => {
    mapper = new ChatMapper();
  });

  const buildUser = (id: string) => ({
    id,
    login: `login-${id}`,
    name: null,
    picture: null,
  });

  const buildMember = (
    userId: string,
    lastReadAt: Date,
  ): ChatMemberBasicInfo => ({
    id: `member-${userId}`,
    chatId: 'chat-1',
    userId,
    lastReadAt,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    user: buildUser(userId),
  });

  const buildMessage = (
    overrides: Partial<MessageWithSender> = {},
  ): MessageWithSender => ({
    id: 'message-1',
    content: 'hello',
    type: ContentType.TEXT,
    createdAt: messageCreatedAt,
    updatedAt: messageCreatedAt,
    replyToId: null,
    fileName: null,
    fileSize: null,
    mimeType: null,
    sender: buildUser(senderId),
    ...overrides,
  });

  const before = new Date(messageCreatedAt.getTime() - 1000);
  const after = new Date(messageCreatedAt.getTime() + 1000);

  describe('toMessageResponseDto - status', () => {
    it('returns undefined for messages sent by someone else', () => {
      const message = buildMessage();
      const dto = mapper.toMessageResponseDto(
        message,
        'someone-else',
        'chat-1',
        [buildMember(senderId, before), buildMember('someone-else', before)],
      );

      expect(dto.status).toBeUndefined();
    });

    it('returns DELIVERED for own message when members are not provided (just sent)', () => {
      const message = buildMessage();
      const dto = mapper.toMessageResponseDto(message, senderId, 'chat-1');

      expect(dto.status).toBe(MessageStatusType.DELIVERED);
    });

    it('returns DELIVERED in a private chat while the other member has not read it yet', () => {
      const message = buildMessage();
      const members = [
        buildMember(senderId, after),
        buildMember('recipient', before),
      ];

      const dto = mapper.toMessageResponseDto(
        message,
        senderId,
        'chat-1',
        members,
      );

      expect(dto.status).toBe(MessageStatusType.DELIVERED);
    });

    it('returns READ in a private chat once the other member has read up to the message', () => {
      const message = buildMessage();
      const members = [
        buildMember(senderId, before),
        buildMember('recipient', after),
      ];

      const dto = mapper.toMessageResponseDto(
        message,
        senderId,
        'chat-1',
        members,
      );

      expect(dto.status).toBe(MessageStatusType.READ);
    });

    it('returns DELIVERED in a group chat when only some members have read it', () => {
      const message = buildMessage();
      const members = [
        buildMember(senderId, after),
        buildMember('member-b', after),
        buildMember('member-c', before),
      ];

      const dto = mapper.toMessageResponseDto(
        message,
        senderId,
        'chat-1',
        members,
      );

      expect(dto.status).toBe(MessageStatusType.DELIVERED);
    });

    it('returns READ in a group chat once every other member has read up to the message', () => {
      const message = buildMessage();
      const members = [
        buildMember(senderId, after),
        buildMember('member-b', after),
        buildMember('member-c', after),
      ];

      const dto = mapper.toMessageResponseDto(
        message,
        senderId,
        'chat-1',
        members,
      );

      expect(dto.status).toBe(MessageStatusType.READ);
    });
  });

  describe('toChatItemDto', () => {
    const buildChat = (
      members: ChatMemberBasicInfo[],
    ): ChatWithMembersAndMessages => ({
      id: 'chat-1',
      type: ChatType.PRIVATE,
      title: 'Chat',
      picture: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      members,
      messages: [buildMessage()],
    });

    it('passes the precomputed unread count through to the response', () => {
      const members = [
        buildMember(senderId, before),
        buildMember('recipient', before),
      ];
      const chat = buildChat(members);

      const dto = mapper.toChatItemDto(chat, 'recipient', 5);

      expect(dto.unreadCount).toBe(5);
    });

    it('resolves the chat title to the other member for private chats', () => {
      const members = [
        buildMember(senderId, before),
        buildMember('recipient', before),
      ];
      const chat = buildChat(members);
      chat.members[1].user = {
        id: 'recipient',
        login: 'recipient-login',
        name: 'Recipient',
        picture: null,
      };

      const dto = mapper.toChatItemDto(chat, senderId, 0);

      expect(dto.title).toBe('Recipient');
    });
  });
});
