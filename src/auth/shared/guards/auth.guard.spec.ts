import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { AuthGuard } from './auth.guard';
import { UserService } from '../../../user';
import { SessionService } from '../../../session';
import { RequestWithCookies, RequestWithUser } from '../types';

describe('AuthGuard', () => {
  const userService = { findById: jest.fn() };
  const sessionService = { decrypt: jest.fn() };

  let guard: AuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new AuthGuard(
      userService as unknown as UserService,
      sessionService as unknown as SessionService,
    );
  });

  const buildContext = (cookies: Record<string, string>) => {
    const request = { cookies } as RequestWithCookies;
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext & { __request: RequestWithCookies };
  };

  it('throws Unauthorized when there is no session cookie', async () => {
    const context = buildContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(sessionService.decrypt).not.toHaveBeenCalled();
  });

  it('throws Unauthorized when the session token is invalid', async () => {
    sessionService.decrypt.mockResolvedValue({
      type: 'left',
      error: new Error('bad token'),
    });
    const context = buildContext({ session: 'invalid-token' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(userService.findById).not.toHaveBeenCalled();
  });

  it('throws Unauthorized when the session user no longer exists', async () => {
    sessionService.decrypt.mockResolvedValue({
      type: 'right',
      value: {
        sub: 'user-1',
        login: 'login-1',
        email: 'user@example.com',
        role: 'REGULAR',
      },
    });
    userService.findById.mockResolvedValue(null);
    const context = buildContext({ session: 'valid-token' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('attaches the user to the request and allows access for a valid session', async () => {
    const user = {
      id: 'user-1',
      login: 'login-1',
      email: 'user@example.com',
      role: 'REGULAR',
    };
    sessionService.decrypt.mockResolvedValue({
      type: 'right',
      value: {
        sub: 'user-1',
        login: 'login-1',
        email: 'user@example.com',
        role: 'REGULAR',
      },
    });
    userService.findById.mockResolvedValue(user);
    const request = {
      cookies: { session: 'valid-token' },
    } as unknown as RequestWithCookies;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(userService.findById).toHaveBeenCalledWith('user-1');
    expect((request as RequestWithUser).user).toBe(user);
  });
});
