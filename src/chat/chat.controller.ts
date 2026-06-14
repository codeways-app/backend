import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Res,
  Param,
  Post,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { AuthGuard } from '../auth/shared/guards/auth.guard';
import type { RequestWithUser } from '../auth/shared/types';

import { ChatService } from './chat.service';

import {
  ChatItemResponseDto,
  ChatResponseDto,
  MessageResponseDto,
  MessageDto,
} from './shared/dto';

@ApiBearerAuth()
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
    type: ChatItemResponseDto,
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
  @ApiOperation({ summary: 'Get chat with messages' })
  @ApiResponse({
    status: 200,
    type: ChatResponseDto,
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
    return this.chatService.getChatWithMessages(id, req.user.id);
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
    return this.chatService.createMessage(id, req.user.id, dto);
  }

  // ────────────────────────────────────────────────
  // Send file
  // ────────────────────────────────────────────────
  @Post(':id/files')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Send file attachment to chat' })
  @ApiResponse({
    status: 201,
    type: MessageResponseDto,
    description: 'File was sent successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 400,
    description: 'File type is not allowed',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  public async sendFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: RequestWithUser,
  ) {
    if (!file?.path) {
      throw new BadRequestException('This file type is not allowed');
    }

    return this.chatService.createFileMessage(id, req.user.id, file);
  }

  // ────────────────────────────────────────────────
  // Download file
  // ────────────────────────────────────────────────
  @Get(':id/messages/:messageId/file')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Download a message file attachment' })
  @ApiResponse({
    status: 200,
    description: 'File contents',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  public async downloadFile(
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Request() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const { absolutePath, fileName, mimeType } =
      await this.chatService.getFileForDownload(id, messageId, req.user.id);

    res.setHeader('Content-Type', mimeType);
    res.download(absolutePath, fileName);
  }
}
