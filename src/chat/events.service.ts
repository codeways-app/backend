import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventsService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async findMember(chatId: string, userId: string) {
    return this.prismaService.chatMember.findFirst({
      where: {
        chatId,
        userId,
      },
    });
  }
}
