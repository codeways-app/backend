import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Param,
  Post,
  Body,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../auth/shared/guards/auth.guard';
import type { RequestWithUser } from '../auth/shared/types';

import { ChatService } from './chat.service';
import { EventsGateway } from './events.gateway';

import {
  ChatItemDto,
  ChatDto,
  MessageResponseDto,
  MessageDto,
} from './shared/dto';

@ApiTags('chats')
@UseGuards(AuthGuard)
@Controller('chats')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // ────────────────────────────────────────────────
  // Get all chats for current user
  // ────────────────────────────────────────────────
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all chats of current user' })
  @ApiResponse({
    status: 200,
    type: ChatItemDto,
    isArray: true,
    description: "List of user's chats",
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  public async getMyChats(@Request() req: RequestWithUser) {
    return this.chatService.getUserChats(req.user.id);
  }

  // ────────────────────────────────────────────────
  // Get chat messages
  // ────────────────────────────────────────────────
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get chat messages' })
  @ApiResponse({
    status: 200,
    type: ChatDto,
    description: 'User chat messages',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  public async getChatById(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.chatService.getChat(id, req.user.id);
  }

  // ────────────────────────────────────────────────
  // Send message
  // ────────────────────────────────────────────────
  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send message to chat' })
  @ApiResponse({
    status: 201,
    type: MessageResponseDto,
    description: 'Message was sent successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  public async sendMessage(
    @Param('id') id: string,
    @Body() dto: MessageDto,
    @Request() req: RequestWithUser,
  ) {
    const newMessage = await this.chatService.createMessage(
      id,
      req.user.id,
      dto,
    );

    return newMessage;
  }
}
