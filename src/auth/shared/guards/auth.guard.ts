import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { UserService } from '../../../user';
import { SessionService } from '../../../session';

import { RequestWithCookies, RequestWithUser } from '../types';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  public constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithCookies>();

    const accessToken = request.cookies.session;

    if (!accessToken) {
      this.logger.error('User is not authorized');
      throw new UnauthorizedException();
    }

    const session = await this.sessionService.decrypt(accessToken);

    if (session.type === 'left') {
      this.logger.error('Invalid access token request');
      throw new UnauthorizedException();
    }

    const user = await this.userService.findById(session.value.sub);

    if (!user) {
      this.logger.error(`User ${session.value.sub} not found`);
      throw new UnauthorizedException();
    }

    (request as RequestWithUser).user = user;

    return true;
  }
}
