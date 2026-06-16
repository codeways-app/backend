import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { extname } from 'path';
import { diskStorage } from 'multer';

import { SessionService } from '../session/session.service';
import { UserService } from '../user';

import { EmojiController } from './emoji.controller';
import { EmojiService, EMOJIS_DIR } from './emoji.service';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_EMOJI_SIZE = 2 * 1024 * 1024;

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          mkdirSync(EMOJIS_DIR, { recursive: true });
          cb(null, EMOJIS_DIR);
        },
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        cb(null, ALLOWED_MIME_TYPES.includes(file.mimetype));
      },
      limits: { fileSize: MAX_EMOJI_SIZE },
    }),
  ],
  providers: [EmojiService, SessionService, UserService],
  controllers: [EmojiController],
})
export class EmojiModule {}
