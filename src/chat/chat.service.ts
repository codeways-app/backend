import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async isChatMember(chatId: string, userId: string) {
    const member = await this.prismaService.chatMember.findFirst({
      where: {
        chatId,
        userId,
      },
    });

    return !!member;
  }

  public async getUserChats(userId: string) {
    const chats = await this.prismaService.chat.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, login: true, name: true, picture: true },
            },
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                NOT: { senderId: userId },
                statuses: {
                  none: {
                    userId,
                    status: 'READ',
                  },
                },
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            sender: {
              select: { id: true, login: true, name: true, picture: true },
            },
          },
        },
      },
    });

    return chats.map(({ messages, members, _count, ...chat }) => {
      let title = chat.title;
      let picture = chat.picture;

      if (chat.type === 'PRIVATE') {
        const otherMember = members.find((m) => m.user.id !== userId);
        if (otherMember) {
          title = otherMember.user.login;
          picture = otherMember.user.picture;
        }
      }

      return {
        ...chat,
        title,
        picture,
        unreadCount: _count.messages,
        lastMessage: messages[0] ?? null,
      };
    });
  }

  public async getChatMessages(chatId: string, userId: string) {
    const messages = await this.prismaService.message.findMany({
      where: { chatId },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, login: true, name: true, picture: true },
        },
        statuses: {
          where: { userId },
          take: 1,
          select: { status: true },
        },
      },
    });
    return messages.map(({ statuses, ...message }) => ({
      ...message,
      status: statuses[0]?.status ?? null,
    }));
  }
}
