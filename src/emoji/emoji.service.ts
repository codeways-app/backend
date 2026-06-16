import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { mkdirSync } from 'fs';

import { PrismaService } from '../prisma/prisma.service';
import { EmojiResponseDto } from './dto';

export const EMOJIS_DIR = join(process.cwd(), 'uploads', 'emojis');

@Injectable()
export class EmojiService {
  constructor(private readonly prisma: PrismaService) {}

  public async create(
    userId: string,
    file: Express.Multer.File,
    name: string,
  ): Promise<EmojiResponseDto> {
    const emoji = await this.prisma.customEmoji.create({
      data: {
        name,
        fileName: file.filename,
        mimeType: file.mimetype,
        userId,
      },
    });

    return this.toDto(emoji);
  }

  public async findAll(): Promise<EmojiResponseDto[]> {
    const emojis = await this.prisma.customEmoji.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return emojis.map((e) => this.toDto(e));
  }

  public async getImagePath(id: string): Promise<string> {
    const emoji = await this.prisma.customEmoji.findUnique({ where: { id } });
    if (!emoji) throw new NotFoundException('Emoji not found');

    const path = join(EMOJIS_DIR, emoji.fileName);
    if (!existsSync(path)) throw new NotFoundException('Emoji file not found');

    return path;
  }

  public async remove(id: string, userId: string): Promise<void> {
    const emoji = await this.prisma.customEmoji.findUnique({ where: { id } });
    if (!emoji) throw new NotFoundException('Emoji not found');
    if (emoji.userId !== userId)
      throw new ForbiddenException('Not your emoji');

    const path = join(EMOJIS_DIR, emoji.fileName);
    if (existsSync(path)) await unlink(path);

    await this.prisma.customEmoji.delete({ where: { id } });
  }

  private toDto(
    emoji: {
      id: string;
      name: string;
      userId: string;
      createdAt: Date;
    },
  ): EmojiResponseDto {
    return {
      id: emoji.id,
      name: emoji.name,
      imageUrl: `/api/emojis/${emoji.id}/image`,
      userId: emoji.userId,
      createdAt: emoji.createdAt.toISOString(),
    };
  }

  public ensureEmojisDirExists(): void {
    mkdirSync(EMOJIS_DIR, { recursive: true });
  }
}
