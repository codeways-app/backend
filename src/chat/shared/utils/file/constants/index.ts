import { join } from 'path';

export const UPLOADS_DIR = join(process.cwd(), 'uploads');

export const MAX_FILE_SIZE = 25 * 1024 * 1024;

export const BLOCKED_FILE_EXTENSIONS = [
  'exe',
  'msi',
  'bat',
  'cmd',
  'com',
  'scr',
  'jar',
  'sh',
  'apk',
  'app',
  'dmg',
];
