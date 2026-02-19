import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

import { RequestWithUser } from '../../../auth/shared/types';
import { ChatService } from '../../chat.service';

@Injectable()
export class ChatGuard implements CanActivate {
  public constructor(private readonly chatService: ChatService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (!request.params.id) {
      throw new ForbiddenException('Chat ID is required');
    }

    const isMember = await this.chatService.isChatMember(
      request.params.id as string,
      request.user.id,
    );

    if (!isMember) {
      throw new ForbiddenException('Access to this chat is forbidden');
    }

    return true;
  }
}
