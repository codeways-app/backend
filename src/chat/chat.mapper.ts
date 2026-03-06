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
  MessageWithSenderAndStatuses,
} from './shared/types';
import { ChatInfoResponseDto } from './shared/dto/chat-info-response.dto';

@Injectable()
export class ChatMapper {
  private resolveChatInfo(
    chat: ChatWithMembersAndMessages,
    userId: string,
  ): ChatInfoResponseDto {
    let title = chat.title;
    let picture = chat.picture;

    if (chat.type === ChatType.PRIVATE) {
      const otherMember = chat.members.find((m) => m.user.id !== userId);
      if (otherMember) {
        title = otherMember.user.name || otherMember.user.login || 'Unknown';
        picture = null;
      }
    }

    return {
      title: title || 'Chat',
      additionalInfo: 'additional info',
      picture: picture || '',
    };
  }

  private resolveMessageStatus(
    message: MessageWithSenderAndStatuses,
    userId: string,
  ): MessageStatusType | undefined {
    if (message.sender.id !== userId) {
      return undefined;
    }

    return message.statuses[0]?.status;
  }

  public toChatItemDto(
    chat: ChatWithMembersAndMessages,
    userId: string,
  ): ChatItemDto {
    const { messages, _count, ...chatData } = chat;

    const chatInfo = this.resolveChatInfo(chat, userId);

    const lastMessageRaw = messages[0] ?? null;
    const lastMessage = lastMessageRaw
      ? this.toMessageResponseDto(lastMessageRaw, userId)
      : undefined;

    // fix bug with unreadCount
    console.log('unreadCount', _count?.messages);
    // LOGS
    // unreadCount 0
    // unreadCount 5
    // unreadCount 0
    // unreadCount 7

    return {
      id: chatData.id,
      title: chatInfo.title,
      picture: chatInfo.picture,
      unreadCount: _count?.messages ?? 0,
      lastMessage,
    };
  }

  public toChatDto(chat: ChatWithMembersAndMessages, userId: string): ChatDto {
    const chatInfo = this.resolveChatInfo(chat, userId);
    return {
      title: chatInfo.title,
      additionalInfo: chatInfo.additionalInfo,
      messages: chat.messages.map((m) => this.toMessageResponseDto(m, userId)),
    };
  }

  public toMessageResponseDto(
    message: MessageWithSenderAndStatuses,
    userId: string,
  ): MessageResponseDto {
    const { sender, ...messageData } = message;

    return {
      id: messageData.id,
      content: messageData.content,
      type: messageData.type,
      sender: sender as MessageSenderDto,
      ...(messageData.replyToId && { replyToId: messageData.replyToId }),
      status: this.resolveMessageStatus(message, userId),
      createdAt: messageData.createdAt.toISOString(),
      updatedAt: messageData.updatedAt.toISOString(),
    };
  }
}
