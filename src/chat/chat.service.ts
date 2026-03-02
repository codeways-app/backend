import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageStatusType, ContentType } from '../../generated/prisma';
import { SendMessageDto } from './shared/dto/message-send.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
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
            statuses: {
              where: { userId },
              take: 1,
              select: { status: true },
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
      const lastMessageRaw = messages[0] ?? null;

      const lastMessage = lastMessageRaw
        ? (() => {
            const { statuses, ...message } = lastMessageRaw;

            return {
              ...message,
              status: statuses[0]?.status ?? null,
            };
          })()
        : null;

      return {
        ...chat,
        title,
        picture,
        unreadCount: _count.messages,
        lastMessage,
      };
    });
  }

  public async getChat(chatId: string, userId: string) {
    const chat = await this.prismaService.chat.findUnique({
      where: { id: chatId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, login: true, name: true, picture: true },
            },
          },
        },
        messages: {
          take: 20,
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, login: true, name: true, picture: true },
            },
            statuses: {
              select: {
                userId: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!chat) {
      return null;
    }

    let title = chat.title;

    if (chat.type === 'PRIVATE') {
      const otherMember = chat.members.find((m) => m.user.id !== userId);
      if (otherMember) {
        title = otherMember.user.login;
      }
    }

    return {
      title,
      additionalInfo: 'additional info',
      messages: chat.messages.map(({ statuses, ...message }) => ({
        ...message,
        status:
          message.senderId === userId ? (statuses[0]?.status ?? null) : null,
      })),
    };
  }

  public async createMessage(dto: SendMessageDto) {
    const type = dto.message.type.toUpperCase() as ContentType;

    const message = await this.prismaService.message.create({
      data: {
        chatId: dto.chatId,
        senderId: dto.userId,
        content: dto.message.content,
        type,
        replyToId: dto.message.replyToId ?? null,
        statuses: {
          create: {
            userId: dto.userId,
            status: MessageStatusType.SENT,
          },
        },
      },
      include: {
        sender: {
          select: { id: true, login: true, name: true, picture: true },
        },
        statuses: {
          where: { userId: dto.userId },
          select: { status: true },
        },
      },
    });

    const { statuses, ...messageData } = message;

    return {
      ...messageData,
      status: statuses[0]?.status ?? null,
    };
  }
}
