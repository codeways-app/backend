import { Socket } from 'socket.io';
import { SessionEntity } from '../../../session/entities/domain';

export interface AuthenticatedSocket extends Socket {
  data: {
    user: SessionEntity;
  };
}
