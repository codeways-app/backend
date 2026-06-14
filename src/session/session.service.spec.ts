import { ConfigService } from '@nestjs/config';

import { SessionService } from './session.service';
import { SessionEntity } from './entities/domain';

describe('SessionService', () => {
  const buildService = (secret = 'test-session-secret') => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue(secret),
    };
    return new SessionService(configService as unknown as ConfigService);
  };

  const payload: SessionEntity = {
    sub: 'user-1',
    login: 'login-1',
    email: 'user1@example.com',
    role: 'REGULAR',
  };

  it('reads the signing secret from the config service', () => {
    const configService = { getOrThrow: jest.fn().mockReturnValue('secret') };
    new SessionService(configService as unknown as ConfigService);

    expect(configService.getOrThrow).toHaveBeenCalledWith('SESSION_SECRET');
  });

  it('encrypts a session payload into a verifiable JWT', async () => {
    const service = buildService();

    const token = await service.encrypt(payload);

    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('decrypts a token produced by encrypt back into the original payload', async () => {
    const service = buildService();
    const token = await service.encrypt(payload);

    const result = await service.decrypt(token);

    expect(result.type).toBe('right');
    if (result.type === 'right') {
      expect(result.value.sub).toBe(payload.sub);
      expect(result.value.login).toBe(payload.login);
      expect(result.value.email).toBe(payload.email);
      expect(result.value.role).toBe(payload.role);
    }
  });

  it('returns a left with an Error for an invalid token', async () => {
    const service = buildService();

    const result = await service.decrypt('not-a-valid-jwt');

    expect(result.type).toBe('left');
    if (result.type === 'left') {
      expect(result.error).toBeInstanceOf(Error);
    }
  });

  it('returns a left when no token is provided', async () => {
    const service = buildService();

    const result = await service.decrypt(undefined);

    expect(result.type).toBe('left');
  });

  it('returns a left when the token was signed with a different secret', async () => {
    const issuer = buildService('secret-a');
    const verifier = buildService('secret-b');

    const token = await issuer.encrypt(payload);
    const result = await verifier.decrypt(token);

    expect(result.type).toBe('left');
  });
});
