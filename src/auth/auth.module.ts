import { Module } from '@nestjs/common';
import { GoogleRecaptchaModule } from '@nestlab/google-recaptcha';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { getRecaptchaConfig } from '../configs/recaptcha';
import { MailModule } from '../libs/mail';

import { UserService } from '../user';
import { SessionService } from '../session';

import { AuthController } from './auth.controller';
import { EmailConfirmationService } from './email-confirmation';
import { RegisterService } from './register';
import { LoginService } from './login';

@Module({
  imports: [
    GoogleRecaptchaModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getRecaptchaConfig,
      inject: [ConfigService],
    }),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [
    RegisterService,
    LoginService,
    UserService,
    SessionService,
    EmailConfirmationService,
  ],
})
export class AuthModule {}
