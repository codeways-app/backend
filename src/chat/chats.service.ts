import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async findMember(chatId: string, userId: string) {
    return this.prismaService.chatMember.findFirst({
      where: {
        chatId,
        userId,
      },
    });
  }

  public async getUserChats(userId: string) {
    return this.prismaService.chat.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  public async getChatById(chatId: string) {
    return this.prismaService.chat.findUnique({
      where: {
        id: chatId,
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  public async getChatMessages(userId: string, chatId: string) {
    const member = await this.findMember(chatId, userId);
    if (!member) {
      return [];
    }

    return this.prismaService.message.findMany({
      where: { chatId },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, name: true, picture: true } },
        statuses: {
          where: { userId },
        },
      },
    });
  }
}
