import { MessageStatusType } from '../../../../generated/prisma';

export const USER_SELECT = {
  id: true,
  login: true,
  name: true,
  picture: true,
} as const;

export const MESSAGE_INCLUDE = () =>
  ({
    sender: { select: USER_SELECT },
    statuses: {
      select: { userId: true, status: true },
    },
  }) as const;

export const CHAT_INCLUDE = (userId: string) =>
  ({
    members: {
      include: {
        user: { select: USER_SELECT },
      },
    },
    _count: {
      select: {
        messages: {
          where: {
            NOT: { senderId: userId },
            statuses: {
              none: { userId, status: MessageStatusType.READ },
            },
          },
        },
      },
    },
    messages: {
      take: 1,
      orderBy: { createdAt: 'desc' as const },
      include: MESSAGE_INCLUDE(),
    },
  }) as const;
