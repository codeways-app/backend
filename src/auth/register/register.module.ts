import { Module } from '@nestjs/common';
import { MailModule } from '../../libs/mail';
import { UserService } from '../../user';
import { SessionService } from '../../session';
import { EmailConfirmationService } from '../email-confirmation';
import { RegisterService } from './register.service';

@Module({
  imports: [MailModule],
  providers: [
    RegisterService,
    UserService,
    SessionService,
    EmailConfirmationService,
  ],
})
export class RegisterModule {}
