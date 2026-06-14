import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { verify } from 'argon2';

import { LoginService } from './login.service';
import { UserService } from '../../user';
import { SessionService } from '../../session';
import { EmailConfirmationService } from '../email-confirmation';
import { TokenType } from '../../../generated/prisma';

jest.mock('argon2', () => ({ verify: jest.fn() }));

describe('LoginService', () => {
  const userService = { findByLogin: jest.fn() };
  const sessionService = { encrypt: jest.fn() };
  const emailConfirmationService = {
    generateToken: jest.fn(),
    sendToken: jest.fn(),
    isTokenMatch: jest.fn(),
    deleteToken: jest.fn(),
  };

  let service: LoginService;

  const user = {
    id: 'user-1',
    login: 'login-1',
    email: 'user1@example.com',
    role: 'REGULAR',
    password: 'hashed-password',
    isTwoFactorEnable: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessionService.encrypt.mockResolvedValue('access-token');
    service = new LoginService(
      userService as unknown as UserService,
      sessionService as unknown as SessionService,
      emailConfirmationService as unknown as EmailConfirmationService,
    );
  });

  describe('login', () => {
    it('throws Unauthorized when the user does not exist', async () => {
      userService.findByLogin.mockResolvedValue(null);

      await expect(
        service.login({ login: 'unknown', password: 'pw' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws Unauthorized when the password is invalid', async () => {
      userService.findByLogin.mockResolvedValue(user);
      (verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ login: user.login, password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(sessionService.encrypt).not.toHaveBeenCalled();
    });

    it('sends a two-factor token and skips issuing a session when 2FA is enabled', async () => {
      userService.findByLogin.mockResolvedValue({
        ...user,
        isTwoFactorEnable: true,
      });
      (verify as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        login: user.login,
        password: 'correct',
      });

      expect(emailConfirmationService.generateToken).toHaveBeenCalledWith(
        user.email,
        TokenType.TWO_FACTOR,
      );
      expect(emailConfirmationService.sendToken).toHaveBeenCalledWith(
        user.email,
        TokenType.TWO_FACTOR,
      );
      expect(result).toEqual({ message: 'Two-Factor token sent' });
      expect(sessionService.encrypt).not.toHaveBeenCalled();
    });

    it('returns an access token for a valid login without 2FA', async () => {
      userService.findByLogin.mockResolvedValue(user);
      (verify as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        login: user.login,
        password: 'correct',
      });

      expect(sessionService.encrypt).toHaveBeenCalledWith({
        sub: user.id,
        login: user.login,
        email: user.email,
        role: user.role,
      });
      expect(result).toEqual({ accessToken: 'access-token' });
    });
  });

  describe('twoFactor', () => {
    it('throws NotFound when the user does not exist', async () => {
      userService.findByLogin.mockResolvedValue(null);

      await expect(
        service.twoFactor({ login: 'unknown', token: '123456' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('verifies the token, clears it and returns a new access token', async () => {
      userService.findByLogin.mockResolvedValue(user);

      const result = await service.twoFactor({
        login: user.login,
        token: '123456',
      });

      expect(emailConfirmationService.isTokenMatch).toHaveBeenCalledWith(
        user.email,
        '123456',
        TokenType.TWO_FACTOR,
      );
      expect(emailConfirmationService.deleteToken).toHaveBeenCalledWith(
        user.email,
        TokenType.TWO_FACTOR,
      );
      expect(result).toEqual({ accessToken: 'access-token' });
    });
  });
});
