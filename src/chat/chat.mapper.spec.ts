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

  describe('toMessageResponseDto - replies', () => {
    it('includes replyToId when the message is a reply', () => {
      const message = buildMessage({ replyToId: 'message-0' });

      const dto = mapper.toMessageResponseDto(message, senderId, 'chat-1');

      expect(dto.replyToId).toBe('message-0');
    });

    it('omits replyToId when the message is not a reply', () => {
      const message = buildMessage();

      const dto = mapper.toMessageResponseDto(message, senderId, 'chat-1');

      expect(dto.replyToId).toBeUndefined();
    });
  });

  describe('toMessageResponseDto - file attachments', () => {
    it('includes file metadata and a download URL for non-text messages with a file name', () => {
      const message = buildMessage({
        type: ContentType.IMAGE,
        content: 'chat-1/photo.png',
        fileName: 'photo.png',
        fileSize: 1024,
        mimeType: 'image/png',
      });

      const dto = mapper.toMessageResponseDto(message, senderId, 'chat-1');

      expect(dto.fileName).toBe('photo.png');
      expect(dto.fileSize).toBe(1024);
      expect(dto.mimeType).toBe('image/png');
      expect(dto.fileUrl).toBe(`/api/chats/chat-1/messages/${message.id}/file`);
    });

    it('omits file metadata for text messages', () => {
      const message = buildMessage();

      const dto = mapper.toMessageResponseDto(message, senderId, 'chat-1');

      expect(dto.fileName).toBeUndefined();
      expect(dto.fileUrl).toBeUndefined();
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

    it('keeps the stored title for group chats', () => {
      const members = [
        buildMember(senderId, before),
        buildMember('member-b', before),
      ];
      const chat = buildChat(members);
      chat.type = ChatType.GROUP;
      chat.title = 'Project Team';

      const dto = mapper.toChatItemDto(chat, senderId, 0);

      expect(dto.title).toBe('Project Team');
    });

    it('returns no lastMessage when the chat has no messages', () => {
      const members = [
        buildMember(senderId, before),
        buildMember('recipient', before),
      ];
      const chat = buildChat(members);
      chat.messages = [];

      const dto = mapper.toChatItemDto(chat, senderId, 0);

      expect(dto.lastMessage).toBeUndefined();
    });
  });

  describe('toChatDto', () => {
    it('maps chat info and all messages for the conversation view', () => {
      const members = [
        buildMember(senderId, before),
        buildMember('recipient', before),
      ];
      const chat: ChatWithMembersAndMessages = {
        id: 'chat-1',
        type: ChatType.GROUP,
        title: 'Project Team',
        picture: 'group.png',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        members,
        messages: [buildMessage(), buildMessage({ id: 'message-2' })],
      };

      const dto = mapper.toChatDto(chat, senderId);

      expect(dto.title).toBe('Project Team');
      expect(dto.picture).toBe('group.png');
      expect(dto.participantsCount).toBe(2);
      expect(dto.messages).toHaveLength(2);
      expect(dto.messages[0].id).toBe('message-1');
      expect(dto.messages[1].id).toBe('message-2');
    });
  });
});
