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
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    private readonly prismaService: PrismaService,
    private readonly chatMapper: ChatMapper,
  ) {}

  public async markMessagesAsRead(
    chatId: string,
    userId: string,
  ): Promise<void> {
    await this.prismaService.messageStatus.updateMany({
      where: {
        userId: { not: userId },
        message: { chatId },
        status: { not: MessageStatusType.READ },
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

    console.log('chats', JSON.stringify(chats, null, 4));

    return chats.map((chat) => this.chatMapper.toChatItemDto(chat, userId));
  }

  public async getChatWithMessages(
    chatId: string,
    userId: string,
  ): Promise<ChatDto> {
    // TODO: mark messages as read
    // await this.markMessagesAsRead(chatId, userId);

    const chatMessages = await this.prismaService.chat.findFirst({
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
          orderBy: { createdAt: 'desc' },
          include: MESSAGE_INCLUDE(),
        },
      },
    });
    if (!chatMessages) {
      throw new ForbiddenException('Chat not found or access denied');
    }
    const result = this.chatMapper.toChatDto(chatMessages, userId);

    return result;
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

    const type = message.type.toUpperCase() as ContentType;

    const newMessage = await this.prismaService.message.create({
      data: {
        chatId,
        senderId: userId,
        content: message.content,
        type,
        ...(message.replyToId && { replyToId: message.replyToId }),
        statuses: {
          create: {
            userId,
            status: MessageStatusType.DELIVERED,
          },
        },
      },
      include: MESSAGE_INCLUDE(),
    });

    const result = this.chatMapper.toMessageResponseDto(newMessage, userId);

    this.eventsGateway.emitMessage(chatId, result);

    await this.markMessagesAsRead(chatId, userId);

    return result;
  }
}
