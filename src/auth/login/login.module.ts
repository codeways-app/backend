import { Module } from '@nestjs/common';

import { UserService } from '../../user';
import { SessionService } from '../../session';
import { MailModule } from '../../libs/mail';

import { EmailConfirmationService } from '../email-confirmation';

import { LoginService } from './login.service';

@Module({
  imports: [MailModule],
  providers: [
    LoginService,
    UserService,
    SessionService,
    EmailConfirmationService,
  ],
})
export class LoginModule {}
