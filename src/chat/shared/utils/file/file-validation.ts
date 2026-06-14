import { BLOCKED_FILE_EXTENSIONS } from './constants';

export const isFileTypeAllowed = (originalName: string): boolean => {
  const extension = originalName.split('.').pop()?.toLowerCase() ?? '';
  return !BLOCKED_FILE_EXTENSIONS.includes(extension);
};
