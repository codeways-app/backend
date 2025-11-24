import { Module } from '@nestjs/common';

import { MailService } from '../../libs/mail';
import { UserService } from '../../user';

import { EmailConfirmationService } from './email-confirmation.service';

@Module({
  providers: [EmailConfirmationService, MailService, UserService],
})
export class EmailConfirmationModule {}
