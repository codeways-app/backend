import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';

import { PrismaService } from '../prisma/prisma.service';
import { ContentType } from '../../generated/prisma';
import { MessageDto } from './shared/dto/message.dto';
import { EventsGateway } from './events.gateway';
import { ChatMapper } from './chat.mapper';
import {
  ChatItemResponseDto,
  ChatResponseDto,
  MessageResponseDto,
} from './shared/dto';

import { CHAT_INCLUDE, MESSAGE_INCLUDE, USER_SELECT } from './shared/constants';
import { UPLOADS_DIR, resolveContentType, hashFile } from './shared/utils';
import { SearchService } from '../search';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  public constructor(
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    private readonly prismaService: PrismaService,
    private readonly chatMapper: ChatMapper,
    private readonly searchService: SearchService,
  ) {}

  public async markMessagesAsRead(
    chatId: string,
    userId: string,
  ): Promise<void> {
    await this.prismaService.chatMember.updateMany({
      where: { chatId, userId },
      data: { lastReadAt: new Date() },
    });
  }

  public async isChatMember(chatId: string, userId: string): Promise<boolean> {
    const member = await this.prismaService.chatMember.findFirst({
      where: { chatId, userId },
      select: { id: true },
    });

    return !!member;
  }

  public async getUserChats(userId: string): Promise<ChatItemResponseDto[]> {
    const chats = await this.prismaService.chat.findMany({
      where: {
        members: { some: { userId } },
      },
      include: CHAT_INCLUDE(),
    });

    chats.sort((a, b) => {
      const dateA =
        a.messages.length > 0 ? a.messages[0].createdAt : a.createdAt;
      const dateB =
        b.messages.length > 0 ? b.messages[0].createdAt : b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });

    return Promise.all(
      chats.map(async (chat) => {
        const member = chat.members.find((m) => m.userId === userId);
        const unreadCount = await this.prismaService.message.count({
          where: {
            chatId: chat.id,
            senderId: { not: userId },
            createdAt: { gt: member?.lastReadAt ?? new Date(0) },
          },
        });

        return this.chatMapper.toChatItemDto(chat, userId, unreadCount);
      }),
    );
  }

  public async getChatWithMessages(
    chatId: string,
    userId: string,
  ): Promise<ChatResponseDto> {
    // TODO: update mark messages as read by screen view size
    await this.markMessagesAsRead(chatId, userId);

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
      },
      include: MESSAGE_INCLUDE(),
    });

    const result = this.chatMapper.toMessageResponseDto(
      newMessage,
      userId,
      chatId,
    );

    this.eventsGateway.emitMessage(chatId, result);

    await this.markMessagesAsRead(chatId, userId);

    void this.searchService.indexMessage(
      newMessage.id,
      chatId,
      message.content,
    );

    return result;
  }

  public async createFileMessage(
    chatId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<MessageResponseDto> {
    const isMember = await this.isChatMember(chatId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    const sizeMatches = await this.prismaService.message.findMany({
      where: { chatId, fileSize: file.size },
      select: { id: true, content: true, fileHash: true },
    });

    let content = `${chatId}/${file.filename}`;
    let fileHash: string | null = null;

    if (sizeMatches.length > 0) {
      fileHash = await hashFile(file.path);

      for (const match of sizeMatches) {
        const matchPath = join(UPLOADS_DIR, match.content);
        if (!match.fileHash && !existsSync(matchPath)) {
          continue;
        }

        const matchHash = match.fileHash ?? (await hashFile(matchPath));

        if (!match.fileHash) {
          await this.prismaService.message.update({
            where: { id: match.id },
            data: { fileHash: matchHash },
          });
        }

        if (matchHash === fileHash) {
          await unlink(file.path);
          content = match.content;
          break;
        }
      }
    }

    const newMessage = await this.prismaService.message.create({
      data: {
        chatId,
        senderId: userId,
        content,
        type: resolveContentType(file.mimetype),
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileHash,
      },
      include: MESSAGE_INCLUDE(),
    });

    const result = this.chatMapper.toMessageResponseDto(
      newMessage,
      userId,
      chatId,
    );

    this.eventsGateway.emitMessage(chatId, result);

    await this.markMessagesAsRead(chatId, userId);

    return result;
  }

  public async getFileForDownload(
    chatId: string,
    messageId: string,
    userId: string,
  ): Promise<{ absolutePath: string; fileName: string; mimeType: string }> {
    const isMember = await this.isChatMember(chatId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    const message = await this.prismaService.message.findFirst({
      where: { id: messageId, chatId },
    });

    if (
      !message ||
      message.type === ContentType.TEXT ||
      message.type === ContentType.EMOJI ||
      !message.fileName
    ) {
      throw new NotFoundException('File not found');
    }

    const absolutePath = join(UPLOADS_DIR, message.content);
    if (!existsSync(absolutePath)) {
      throw new NotFoundException('File not found');
    }

    return {
      absolutePath,
      fileName: message.fileName,
      mimeType: message.mimeType ?? 'application/octet-stream',
    };
  }
}
