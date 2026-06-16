import { Module } from '@nestjs/common';

import { SessionService } from '../session/session.service';

import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  providers: [UserService, SessionService],
  controllers: [UserController],
})
export class UserModule {}
