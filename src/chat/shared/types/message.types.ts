import { Message, MessageStatusType } from '../../../../generated/prisma';
import { UserBasicInfo } from './user.type';

export type MessageBasicInfo = Pick<
  Message,
  'id' | 'content' | 'type' | 'createdAt' | 'updatedAt' | 'replyToId'
>;

export type MessageWithSenderAndStatuses = MessageBasicInfo & {
  sender: UserBasicInfo;
  statuses: { status?: MessageStatusType }[];
};
