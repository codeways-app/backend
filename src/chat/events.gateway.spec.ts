import { WsException } from '@nestjs/websockets';

import { EventsGateway } from './events.gateway';
import { ChatService } from './chat.service';
import { SessionService } from '../session/session.service';
import type { AuthenticatedSocket } from './shared/types';

describe('EventsGateway', () => {
  const sessionService = {};
  const chatService = { isChatMember: jest.fn() };

  let gateway: EventsGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new EventsGateway(
      sessionService as unknown as SessionService,
      chatService as unknown as ChatService,
    );
  });

  const buildClient = (userId: string, join: jest.Mock, to: jest.Mock) =>
    ({
      data: {
        user: {
          sub: userId,
          login: `login-${userId}`,
          email: '',
          role: 'REGULAR',
        },
      },
      join,
      to,
    }) as unknown as AuthenticatedSocket;

  describe('afterInit', () => {
    it('registers the socket auth middleware', () => {
      const use = jest.fn();
      const server = { use } as unknown as Parameters<
        EventsGateway['afterInit']
      >[0];

      gateway.afterInit(server);

      expect(use).toHaveBeenCalledTimes(1);
      expect(use).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('handleJoinRoom', () => {
    it('throws when the user is not a member of the chat', async () => {
      chatService.isChatMember.mockResolvedValue(false);
      const join = jest.fn();
      const to = jest.fn();
      const client = buildClient('user-1', join, to);

      await expect(gateway.handleJoinRoom(client, 'chat-1')).rejects.toThrow(
        WsException,
      );
      expect(join).not.toHaveBeenCalled();
    });

    it('joins the room and notifies it when the user is a member', async () => {
      chatService.isChatMember.mockResolvedValue(true);
      const emit = jest.fn();
      const join = jest.fn();
      const to = jest.fn().mockReturnValue({ emit });
      const client = buildClient('user-1', join, to);

      await gateway.handleJoinRoom(client, 'chat-1');

      expect(chatService.isChatMember).toHaveBeenCalledWith('chat-1', 'user-1');
      expect(join).toHaveBeenCalledWith('chat-1');
      expect(to).toHaveBeenCalledWith('chat-1');
      expect(emit).toHaveBeenCalledWith('broadcasting', 'chat-1');
    });
  });

  describe('emitMessage', () => {
    it('emits the new message to the chat room', () => {
      const emit = jest.fn();
      const to = jest.fn().mockReturnValue({ emit });
      gateway.server = { to } as unknown as EventsGateway['server'];

      const message = { id: 'message-1' } as Parameters<
        EventsGateway['emitMessage']
      >[1];
      gateway.emitMessage('chat-1', message);

      expect(to).toHaveBeenCalledWith('chat-1');
      expect(emit).toHaveBeenCalledWith('newMessage', {
        chatId: 'chat-1',
        message,
      });
    });
  });
});
