import { Injectable } from '@nestjs/common';
import {
  ChatType,
  ContentType,
  MessageStatusType,
} from '../../generated/prisma';

import {
  ChatItemResponseDto,
  ChatResponseDto,
  MessageResponseDto,
  MessageSenderDto,
} from './shared/dto';
import {
  ChatInfo,
  ChatMemberBasicInfo,
  ChatWithMembersAndMessages,
  MessageWithSender,
} from './shared/types';

@Injectable()
export class ChatMapper {
  private resolveChatInfo(
    chat: ChatWithMembersAndMessages,
    userId: string,
  ): ChatInfo {
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
      additionalInfo: 'last seen recently',
      picture: picture || '',
      participantsCount: chat.members.length,
    };
  }

  private resolveMessageStatus(
    message: MessageWithSender,
    userId: string,
    members?: ChatMemberBasicInfo[],
  ): MessageStatusType | undefined {
    if (message.sender.id !== userId) {
      return undefined;
    }

    if (!members) {
      return MessageStatusType.DELIVERED;
    }

    const otherMembers = members.filter((m) => m.userId !== userId);
    if (otherMembers.length === 0) {
      return MessageStatusType.DELIVERED;
    }

    const allRead = otherMembers.every(
      (m) => m.lastReadAt.getTime() >= message.createdAt.getTime(),
    );

    return allRead ? MessageStatusType.READ : MessageStatusType.DELIVERED;
  }

  public toChatItemDto(
    chat: ChatWithMembersAndMessages,
    userId: string,
    unreadCount: number,
  ): ChatItemResponseDto {
    const { messages, ...chatData } = chat;

    const chatInfo = this.resolveChatInfo(chat, userId);

    const lastMessageRaw = messages[0] ?? null;
    const lastMessage = lastMessageRaw
      ? this.toMessageResponseDto(
          lastMessageRaw,
          userId,
          chatData.id,
          chat.members,
        )
      : undefined;

    return {
      id: chatData.id,
      title: chatInfo.title,
      picture: chatInfo.picture,
      unreadCount,
      lastMessage,
      participantsCount: chatInfo.participantsCount,
    };
  }

  public toChatDto(
    chat: ChatWithMembersAndMessages,
    userId: string,
  ): ChatResponseDto {
    const chatInfo = this.resolveChatInfo(chat, userId);

    return {
      title: chatInfo.title,
      additionalInfo: chatInfo.additionalInfo,
      picture: chatInfo.picture,
      participantsCount: chatInfo.participantsCount,
      messages: chat.messages.map((m) =>
        this.toMessageResponseDto(m, userId, chat.id, chat.members),
      ),
    };
  }

  public toMessageResponseDto(
    message: MessageWithSender,
    userId: string,
    chatId: string,
    members?: ChatMemberBasicInfo[],
  ): MessageResponseDto {
    const { sender, ...messageData } = message;

    const hasFile =
      messageData.type !== ContentType.TEXT && messageData.fileName;

    return {
      id: messageData.id,
      content: messageData.content,
      type: messageData.type,
      sender: sender as MessageSenderDto,
      ...(messageData.replyToId && { replyToId: messageData.replyToId }),
      status: this.resolveMessageStatus(message, userId, members),
      createdAt: messageData.createdAt.toISOString(),
      updatedAt: messageData.updatedAt.toISOString(),
      ...(hasFile && {
        fileName: messageData.fileName!,
        fileSize: messageData.fileSize ?? undefined,
        mimeType: messageData.mimeType ?? undefined,
        fileUrl: `/api/chats/${chatId}/messages/${messageData.id}/file`,
      }),
    };
  }
}
