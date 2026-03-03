import { Socket } from 'socket.io';
import { WsJwtGuard } from './ws-jwt.guard';
import { SessionService } from '../../../session/session.service';

export type SocketMiddleware = {
  (client: Socket, next: (err?: Error) => void): void;
};

export const SocketAuthMiddleware = (
  sessionService: SessionService,
): SocketMiddleware => {
  return (client, next) => {
    WsJwtGuard.validateToken(client, sessionService)
      .then(() => next())
      .catch((error) => next(error as Error));
  };
};
