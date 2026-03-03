import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageStatusType, ContentType } from '../../generated/prisma';
import { MessageDto } from './shared/dto/message.dto';
import { EventsGateway } from './events.gateway';
import { ChatMapper } from './chat.mapper';
import { ChatItemDto, ChatDto, MessageResponseDto } from './shared/dto';

import { CHAT_INCLUDE, MESSAGE_INCLUDE, USER_SELECT } from './shared/constants';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  public constructor(
    private readonly prismaService: PrismaService,
    private readonly chatMapper: ChatMapper,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
  ) {}

  public async markMessagesAsRead(
    chatId: string,
    userId: string,
  ): Promise<void> {
    await this.prismaService.messageStatus.updateMany({
      where: {
        userId,
        message: { chatId, NOT: { senderId: userId } },
        NOT: { status: MessageStatusType.READ },
      },
      data: { status: MessageStatusType.READ },
    });
  }

  public async isChatMember(chatId: string, userId: string): Promise<boolean> {
    const member = await this.prismaService.chatMember.findFirst({
      where: { chatId, userId },
      select: { id: true },
    });

    return !!member;
  }

  public async getUserChats(userId: string): Promise<ChatItemDto[]> {
    const chats = await this.prismaService.chat.findMany({
      where: {
        members: { some: { userId } },
      },
      include: CHAT_INCLUDE(userId),
      orderBy: { updatedAt: 'desc' },
    });

    return chats.map((chat) => this.chatMapper.toChatItemDto(chat, userId));
  }

  public async getChat(chatId: string, userId: string): Promise<ChatDto> {
    const chat = await this.prismaService.chat.findFirst({
      where: {
        id: chatId,
        members: { some: { userId } },
      },
      include: {
        members: {
          include: {
            user: { select: USER_SELECT },
          },
        },
        messages: {
          take: 100,
          orderBy: { createdAt: 'desc' },
          include: MESSAGE_INCLUDE(userId),
        },
      },
    });

    if (!chat) {
      throw new ForbiddenException('Chat not found or access denied');
    }

    await this.markMessagesAsRead(chatId, userId);

    return this.chatMapper.toChatDto(chat, userId);
  }

  public async createMessage(
    chatId: string,
    userId: string,
    message: MessageDto,
  ): Promise<MessageResponseDto> {
    const isMember = await this.isChatMember(chatId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    await this.markMessagesAsRead(chatId, userId);

    const type = message.type.toUpperCase() as ContentType;

    const newMessage = await this.prismaService.message.create({
      data: {
        chatId,
        senderId: userId,
        content: message.content,
        type,
        replyToId: message.replyToId ?? null,
        statuses: {
          create: {
            userId,
            status: MessageStatusType.DELIVERED,
          },
        },
      },
      include: MESSAGE_INCLUDE(userId),
    });

    const result = this.chatMapper.toMessageResponseDto(newMessage, userId);

    this.eventsGateway.emitMessage(chatId, result);

    return result;
  }
}
