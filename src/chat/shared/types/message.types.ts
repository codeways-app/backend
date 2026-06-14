import { Message } from '../../../../generated/prisma';
import { UserBasicInfo } from './user.type';

export type MessageBasicInfo = Pick<
  Message,
  | 'id'
  | 'content'
  | 'type'
  | 'createdAt'
  | 'updatedAt'
  | 'replyToId'
  | 'fileName'
  | 'fileSize'
  | 'mimeType'
>;

export type MessageWithSender = MessageBasicInfo & {
  sender: UserBasicInfo;
};
