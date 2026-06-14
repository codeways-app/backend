import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

import { ChatService } from './chat.service';
import { ChatMapper } from './chat.mapper';
import { EventsGateway } from './events.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search';
import { UPLOADS_DIR } from './shared/utils';

describe('ChatService - file uploads', () => {
  let service: ChatService;

  const prisma = {
    chatMember: { findFirst: jest.fn(), updateMany: jest.fn() },
    message: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  };
  const eventsGateway = { emitMessage: jest.fn() };
  const chatMapper = {
    toMessageResponseDto: jest.fn().mockReturnValue({ id: 'message-dto' }),
  };

  const chatId = `chat-${randomUUID()}`;
  const userId = `user-${randomUUID()}`;
  const chatDir = join(UPLOADS_DIR, chatId);

  beforeEach(async () => {
    jest.clearAllMocks();
    mkdirSync(chatDir, { recursive: true });

    prisma.chatMember.findFirst.mockResolvedValue({ id: 'member-id' });
    prisma.chatMember.updateMany.mockResolvedValue({ count: 0 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsGateway, useValue: eventsGateway },
        { provide: ChatMapper, useValue: chatMapper },
        { provide: SearchService, useValue: {} },
      ],
    }).compile();

    service = module.get(ChatService);
  });

  afterEach(() => {
    rmSync(chatDir, { recursive: true, force: true });
  });

  const writeUploadedFile = (content: string): Express.Multer.File => {
    const filename = `${randomUUID()}.txt`;
    const filePath = join(chatDir, filename);
    writeFileSync(filePath, content);

    return {
      fieldname: 'file',
      originalname: 'note.txt',
      encoding: '7bit',
      mimetype: 'text/plain',
      destination: chatDir,
      filename,
      path: filePath,
      size: Buffer.byteLength(content),
    } as Express.Multer.File;
  };

  it('throws if the user is not a chat member', async () => {
    prisma.chatMember.findFirst.mockResolvedValue(null);
    const file = writeUploadedFile('hello world');

    await expect(
      service.createFileMessage(chatId, userId, file),
    ).rejects.toThrow(ForbiddenException);
  });

  it('saves an uploaded file as a new message', async () => {
    prisma.message.findMany.mockResolvedValue([]);
    prisma.message.create.mockResolvedValue({ id: 'message-1' });

    const file = writeUploadedFile('hello world');

    await service.createFileMessage(chatId, userId, file);

    expect(prisma.message.create).toHaveBeenCalledTimes(1);
    const { data } = prisma.message.create.mock.calls[0][0];
    expect(data.content).toBe(`${chatId}/${file.filename}`);
    expect(data.fileSize).toBe(file.size);
    expect(data.fileHash).toBeNull();
    expect(existsSync(file.path)).toBe(true);
  });

  it('stores only one copy on disk when the same file is uploaded twice', async () => {
    const content = 'duplicate content';

    const firstFile = writeUploadedFile(content);
    const firstContent = `${chatId}/${firstFile.filename}`;
    prisma.message.findMany.mockResolvedValueOnce([]);
    prisma.message.create.mockResolvedValueOnce({ id: 'message-1' });

    await service.createFileMessage(chatId, userId, firstFile);

    const secondFile = writeUploadedFile(content);
    prisma.message.findMany.mockResolvedValueOnce([
      { id: 'message-1', content: firstContent, fileHash: null },
    ]);
    prisma.message.create.mockResolvedValueOnce({ id: 'message-2' });

    await service.createFileMessage(chatId, userId, secondFile);

    expect(prisma.message.update).toHaveBeenCalledTimes(1);
    const backfilledHash = prisma.message.update.mock.calls[0][0].data.fileHash;
    expect(prisma.message.update).toHaveBeenCalledWith({
      where: { id: 'message-1' },
      data: { fileHash: backfilledHash },
    });

    const { data: secondData } = prisma.message.create.mock.calls[1][0];
    expect(secondData.content).toBe(firstContent);
    expect(secondData.fileHash).toBe(backfilledHash);

    expect(existsSync(firstFile.path)).toBe(true);
    expect(existsSync(secondFile.path)).toBe(false);
  });
});
