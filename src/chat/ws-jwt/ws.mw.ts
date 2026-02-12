import { Socket } from 'socket.io';
import { WsJwtGuard } from './ws-jwt.guard';
import { SessionService } from '../../session/session.service';

export type SocketMiddlewate = {
  (client: Socket, next: (err?: Error) => void): void;
};

export const SocketAuthMiddleware = (
  sessionService: SessionService,
): SocketMiddlewate => {
  return (client, next) => {
    WsJwtGuard.validateToken(client, sessionService)
      .then(() => next())
      .catch((error) => next(error as Error));
  };
};
