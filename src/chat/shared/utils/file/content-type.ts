import { ContentType } from '../../../../../generated/prisma';

export const resolveContentType = (mimetype: string): ContentType => {
  if (mimetype.startsWith('image/')) return ContentType.IMAGE;
  if (mimetype.startsWith('video/')) return ContentType.VIDEO;
  return ContentType.FILE;
};
