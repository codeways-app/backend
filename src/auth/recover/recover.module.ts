import { Module } from '@nestjs/common';

import { MailService } from '../../libs/mail';
import { UserService } from '../../user';
import { EmailConfirmationService } from '../email-confirmation';
import { RecoverService } from './recover.service';

@Module({
  providers: [
    RecoverService,
    EmailConfirmationService,
    UserService,
    MailService,
  ],
})
export class RecoverModule {}
