import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Request,
  Res,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { AuthGuard } from '../auth/shared/guards/auth.guard';
import type { RequestWithUser } from '../auth/shared/types';

import { EmojiService } from './emoji.service';
import { EmojiResponseDto } from './dto';

@ApiTags('emojis')
@Controller('emojis')
export class EmojiController {
  constructor(private readonly emojiService: EmojiService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        name: { type: 'string' },
      },
      required: ['file', 'name'],
    },
  })
  @ApiOperation({ summary: 'Upload a custom emoji' })
  @ApiResponse({ status: 201, type: EmojiResponseDto })
  public async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name: string,
    @Request() req: RequestWithUser,
  ): Promise<EmojiResponseDto> {
    if (!file?.path) throw new BadRequestException('File is required');
    if (!name?.trim()) throw new BadRequestException('Name is required');

    return this.emojiService.create(req.user.id, file, name.trim());
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all custom emojis' })
  @ApiResponse({ status: 200, type: EmojiResponseDto, isArray: true })
  public async list(): Promise<EmojiResponseDto[]> {
    return this.emojiService.findAll();
  }

  @Get(':id/image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get emoji image' })
  public async getImage(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const path = await this.emojiService.getImagePath(id);
    res.sendFile(path);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a custom emoji' })
  @ApiResponse({ status: 204 })
  public async remove(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    return this.emojiService.remove(id, req.user.id);
  }
}
