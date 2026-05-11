import { Chat, ChatMember } from '../../../../generated/prisma';
import { UserBasicInfo } from './user.type';
import { MessageWithSenderAndStatuses } from './message.types';

export type ChatBasicInfo = Pick<
  Chat,
  'id' | 'type' | 'title' | 'picture' | 'createdAt' | 'updatedAt'
>;

export type ChatMemberBasicInfo = ChatMember & {
  user: UserBasicInfo;
};

export type ChatWithMembersAndMessages = ChatBasicInfo & {
  members: ChatMemberBasicInfo[];
  messages: MessageWithSenderAndStatuses[];
  _count?: { messages: number };
};
