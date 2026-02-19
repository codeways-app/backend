import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatListResponseDto } from './shared/dto/chat-list.dto';
import { AuthGuard } from '../auth/shared/guards/auth.guard';
import type { RequestWithUser } from '../auth/shared/types';
import { ChatGuard } from './shared/guards/chat.guard';

@ApiTags('chats')
@UseGuards(AuthGuard)
@Controller('chats')
export class ChatController {
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
    description: "List of user's chats",
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  public async getMyChats(@Request() req: RequestWithUser) {
    return this.chatService.getUserChats(req.user.id);
  }

  // ────────────────────────────────────────────────
  // Get chat messages
  // ────────────────────────────────────────────────

  @Get(':id')
  @UseGuards(ChatGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get chat messages' })
  @ApiResponse({
    status: 200,
    type: ChatListResponseDto,
    description: 'User chat messages',
  })
  public async getChatById(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.chatService.getChatMessages(id, req.user.id);
  }
}
