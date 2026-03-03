import { Injectable } from '@nestjs/common';
import { ChatType, MessageStatusType } from '../../generated/prisma';

import {
  ChatItemDto,
  ChatDto,
  MessageResponseDto,
  MessageSenderDto,
} from './shared/dto';

import {
  ChatWithMembersAndMessages,
  MessageWithSenderAndStatus,
} from './shared/types';

@Injectable()
export class ChatMapper {
  public toChatItemDto(
    chat: ChatWithMembersAndMessages,
    userId: string,
  ): ChatItemDto {
    const { messages, members, _count, ...chatData } = chat;

    let title = chatData.title;
    let picture = chatData.picture;

    if (chatData.type === ChatType.PRIVATE) {
      const otherMember = members.find((m) => m.user.id !== userId);
      if (otherMember) {
        title = otherMember.user.login || otherMember.user.name;
        picture = otherMember.user.picture;
      }
    }

    const lastMessageRaw = messages[0] ?? null;
    const lastMessage = lastMessageRaw
      ? this.toMessageResponseDto(lastMessageRaw, userId)
      : undefined;

    return {
      id: chatData.id,
      title: title || '',
      ...(picture && { picture }),
      unreadCount: _count?.messages ?? 0,
      lastMessage,
    };
  }

  public toChatDto(chat: ChatWithMembersAndMessages, userId: string): ChatDto {
    let title = chat.title;

    if (chat.type === ChatType.PRIVATE) {
      const otherMember = chat.members.find((m) => m.user.id !== userId);
      if (otherMember) {
        title = otherMember.user.login || otherMember.user.name;
      }
    }

    return {
      title: title || 'Chat',
      additionalInfo: 'additional info',
      messages: chat.messages.map((m) => this.toMessageResponseDto(m, userId)),
    };
  }

  public toMessageResponseDto(
    message: MessageWithSenderAndStatus,
    userId: string,
  ): MessageResponseDto {
    const { sender, ...messageData } = message;

    return {
      id: messageData.id,
      content: messageData.content || '',
      type: messageData.type,
      replyToId: messageData.replyToId || undefined,
      sender: sender as MessageSenderDto,
      status: this.resolveMessageStatus(message, userId),
      createdAt: messageData.createdAt.toISOString(),
      updatedAt: messageData.updatedAt.toISOString(),
    };
  }

  private resolveMessageStatus(
    message: MessageWithSenderAndStatus,
    userId: string,
  ): MessageStatusType {
    if (message.statuses && message.statuses.length > 0) {
      if (message.senderId === userId) {
        return message.statuses[0]?.status ?? MessageStatusType.SENT;
      }
    }

    return MessageStatusType.SENT;
  }
}
