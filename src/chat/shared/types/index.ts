import {
  User,
  Message,
  MessageStatusType,
  Chat,
  ChatMember,
} from '../../../../generated/prisma';

export type { AuthenticatedSocket } from './ws.types';

export type UserBasicInfo = Pick<User, 'id' | 'login' | 'name' | 'picture'>;

export type MessageWithSenderAndStatus = Message & {
  sender: UserBasicInfo;
  statuses: { status: MessageStatusType }[];
};

export type ChatWithMembersAndMessages = Chat & {
  members: (ChatMember & {
    user: UserBasicInfo;
  })[];
  messages: MessageWithSenderAndStatus[];
  _count?: { messages: number };
};
