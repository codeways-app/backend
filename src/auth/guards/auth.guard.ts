import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../../user';
import { SessionService } from '../../session';
import { User } from '../../../generated/prisma';

export interface RequestWithCookies extends Request {
  cookies: Record<string, string>;
}

export interface RequestWithUser extends RequestWithCookies {
  user: User;
}

@Injectable()
export class AuthGuard implements CanActivate {
  public constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithCookies>();

    const accessToken = request.cookies?.session;

    if (!accessToken) {
      console.log('No access token');
      throw new UnauthorizedException();
    }

    const session = await this.sessionService.decrypt(accessToken);

    if (session.type === 'left') {
      console.log('Invalid access token request');
      throw new UnauthorizedException();
    }

    const user = await this.userService.findById(session.value.sub);

    if (!user) {
      console.log('User not found');
      throw new UnauthorizedException();
    }

    (request as RequestWithUser).user = user;

    return true;
  }
}
