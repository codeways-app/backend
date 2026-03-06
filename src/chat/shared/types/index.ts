import {
  User,
  Message,
  MessageStatusType,
  Chat,
  ChatMember,
} from '../../../../generated/prisma';

export type { AuthenticatedSocket } from './ws.types';

export type UserBasicInfo = Pick<User, 'id' | 'login' | 'name' | 'picture'>;

export type MessageBasicInfo = Pick<
  Message,
  'id' | 'content' | 'type' | 'createdAt' | 'updatedAt' | 'replyToId'
>;

export type ChatBasicInfo = Pick<
  Chat,
  'id' | 'type' | 'title' | 'picture' | 'createdAt' | 'updatedAt'
>;

export type ChatMemberBasicInfo = ChatMember & {
  user: UserBasicInfo;
};

export type MessageWithSenderAndStatuses = MessageBasicInfo & {
  sender: UserBasicInfo;
  statuses: { status?: MessageStatusType }[];
};

export type ChatWithMembersAndMessages = ChatBasicInfo & {
  members: ChatMemberBasicInfo[];
  messages: MessageWithSenderAndStatuses[];
  _count?: { messages: number };
};
