import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chats.service';
import { ChatListResponseDto } from './shared/dto/chat-list.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { RequestWithUser } from '../auth/guards/auth.guard';

@ApiTags('Chats')
@UseGuards(AuthGuard)
@Controller('chatslist')
export class ChatsListController {
  constructor(private readonly chatService: ChatService) {}

  // ────────────────────────────────────────────────
  // Get all chats for current user
  // ────────────────────────────────────────────────
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all chats of current user' })
  @ApiResponse({
    status: 200,
    type: ChatListResponseDto,
    description: 'List of user chats',
  })
  public async getMyChats(@Request() req: RequestWithUser) {
    return this.chatService.getUserChats(req.user.id);
  }
}

@ApiTags('Chat')
@UseGuards(AuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ────────────────────────────────────────────────
  // Get chat messages
  // ────────────────────────────────────────────────
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all chats of current user' })
  @ApiResponse({
    status: 200,
    type: ChatListResponseDto,
    description: 'List of user chats',
  })
  public async getChatById(
    @Query('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    if (!id) {
      throw new Error('Chat id query param is required');
    }
    const isMember = await this.chatService.findMember(id, req.user.id);
    if (!isMember) {
      throw new Error('User is not a member of this chat');
    }
    return this.chatService.getChatMessages(req.user.id, id);
  }
}
