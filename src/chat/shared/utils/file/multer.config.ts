import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { extname, join } from 'path';

import { MulterModuleOptions } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import { MAX_FILE_SIZE, UPLOADS_DIR } from './constants';
import { isFileTypeAllowed } from './file-validation';

export const chatFilesMulterOptions: MulterModuleOptions = {
  storage: diskStorage({
    destination: (req, _file, callback) => {
      const chatId = String(req.params.id);
      const chatDir = join(UPLOADS_DIR, chatId);
      mkdirSync(chatDir, { recursive: true });
      callback(null, chatDir);
    },
    filename: (_req, file, callback) => {
      const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
      callback(null, uniqueName);
    },
  }),
  fileFilter: (_req, file, callback) => {
    callback(null, isFileTypeAllowed(file.originalname));
  },
  limits: { fileSize: MAX_FILE_SIZE },
};
