import { Injectable } from '@nestjs/common';
import { jwtVerify, SignJWT } from 'jose';
import { SessionEntity } from './entities/domain';
import { left, right, Either } from '../libs/common/utils/either';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SessionService {
  private readonly encodedKey: Uint8Array;

  public constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.getOrThrow<'string'>('SESSION_SECRET');
    this.encodedKey = new TextEncoder().encode(secretKey);
  }

  public async encrypt(payload: SessionEntity): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(this.encodedKey);
  }

  public async decrypt(
    session: string | undefined = '',
  ): Promise<Either<Error, SessionEntity>> {
    try {
      const { payload } = await jwtVerify(session, this.encodedKey, {
        algorithms: ['HS256'],
      });
      return right(payload as SessionEntity);
    } catch (error) {
      return left(error);
    }
  }
}
