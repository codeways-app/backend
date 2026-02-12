import { Injectable } from '@nestjs/common';

import type { AuthenticatedSocket } from '../types/ws.types';

import { SessionService } from '../../session/session.service';

@Injectable()
export class WsJwtGuard {
  constructor(private readonly sessionService: SessionService) {}

  static async validateToken(
    client: AuthenticatedSocket,
    sessionService: SessionService,
  ) {
    const authorization = (client.handshake.headers.authorization ||
      client.handshake.auth?.token ||
      client.handshake.query?.token) as string | undefined;

    if (!authorization) {
      throw new Error('Authorization token not found');
    }

    const token = authorization;

    if (!token) {
      throw new Error('Invalid authorization type');
    }

    const result = await sessionService.decrypt(token);

    if (result.type === 'left') {
      throw new Error('Invalid token');
    }

    client.data.user = result.value;
    return result.value;
  }
}
