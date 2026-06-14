export const USER_SELECT = {
  id: true,
  login: true,
  name: true,
  picture: true,
} as const;

export const MESSAGE_INCLUDE = () =>
  ({
    sender: { select: USER_SELECT },
  }) as const;

export const CHAT_INCLUDE = () =>
  ({
    members: {
      include: {
        user: { select: USER_SELECT },
      },
    },
    messages: {
      take: 1,
      orderBy: { createdAt: 'desc' as const },
      include: MESSAGE_INCLUDE(),
    },
  }) as const;
