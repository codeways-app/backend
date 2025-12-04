import { Module } from '@nestjs/common';
import { UserService } from '../../user';
import { EmailConfirmationService } from '../email-confirmation';
import { RecoverService } from './recover.service';

@Module({
  providers: [RecoverService, EmailConfirmationService, UserService],
})
export class RecoverModule {}
