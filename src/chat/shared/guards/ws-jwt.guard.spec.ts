import { WsJwtGuard, SocketAuthMiddleware } from '.';
import { SessionService } from '../../../session/session.service';
import type { AuthenticatedSocket } from '../types/ws.types';

describe('WsJwtGuard', () => {
  const sessionService = { decrypt: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const buildClient = (
    handshake: Record<string, unknown>,
  ): AuthenticatedSocket =>
    ({
      handshake,
      data: {},
    }) as unknown as AuthenticatedSocket;

  const session = {
    sub: 'user-1',
    login: 'login-1',
    email: 'user@example.com',
    role: 'REGULAR',
  };

  it('throws when no token is present in headers, auth or query', async () => {
    const client = buildClient({ headers: {}, auth: {}, query: {} });

    await expect(
      WsJwtGuard.validateToken(
        client,
        sessionService as unknown as SessionService,
      ),
    ).rejects.toThrow('Authorization token not found');
    expect(sessionService.decrypt).not.toHaveBeenCalled();
  });

  it('throws when the token fails to decrypt', async () => {
    sessionService.decrypt.mockResolvedValue({
      type: 'left',
      error: new Error('bad token'),
    });
    const client = buildClient({
      headers: { authorization: 'bad-token' },
      auth: {},
      query: {},
    });

    await expect(
      WsJwtGuard.validateToken(
        client,
        sessionService as unknown as SessionService,
      ),
    ).rejects.toThrow('Invalid token');
  });

  it.each([
    [
      'headers.authorization',
      { headers: { authorization: 'token' }, auth: {}, query: {} },
    ],
    ['auth.token', { headers: {}, auth: { token: 'token' }, query: {} }],
    ['query.token', { headers: {}, auth: {}, query: { token: 'token' } }],
  ])(
    'reads the token from %s and attaches the session to client.data.user',
    async (_label, handshake) => {
      sessionService.decrypt.mockResolvedValue({
        type: 'right',
        value: session,
      });
      const client = buildClient(handshake);

      const result = await WsJwtGuard.validateToken(
        client,
        sessionService as unknown as SessionService,
      );

      expect(sessionService.decrypt).toHaveBeenCalledWith('token');
      expect(result).toEqual(session);
      expect(client.data.user).toEqual(session);
    },
  );
});

describe('SocketAuthMiddleware', () => {
  const sessionService = { decrypt: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const buildClient = (
    handshake: Record<string, unknown>,
  ): AuthenticatedSocket =>
    ({
      handshake,
      data: {},
    }) as unknown as AuthenticatedSocket;

  it('calls next() without an error when the token is valid', (done) => {
    sessionService.decrypt.mockResolvedValue({
      type: 'right',
      value: {
        sub: 'user-1',
        login: 'login-1',
        email: 'user@example.com',
        role: 'REGULAR',
      },
    });
    const client = buildClient({
      headers: { authorization: 'token' },
      auth: {},
      query: {},
    });
    const middleware = SocketAuthMiddleware(
      sessionService as unknown as SessionService,
    );

    middleware(client, (err) => {
      expect(err).toBeUndefined();
      done();
    });
  });

  it('calls next(error) when the token is missing or invalid', (done) => {
    const client = buildClient({ headers: {}, auth: {}, query: {} });
    const middleware = SocketAuthMiddleware(
      sessionService as unknown as SessionService,
    );

    middleware(client, (err) => {
      expect(err).toBeInstanceOf(Error);
      done();
    });
  });
});
