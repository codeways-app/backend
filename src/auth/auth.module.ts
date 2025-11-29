import { Module } from '@nestjs/common';
import { GoogleRecaptchaModule } from '@nestlab/google-recaptcha';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { ProviderModule } from './provider';
import { MailModule } from '../libs/mail';

import { getProvidersConfig } from '../configs/providers';
import { getRecaptchaConfig } from '../configs/recaptcha';

import { UserService } from '../user';
import { SessionService } from '../session';
import { AuthService } from './auth.service';
import { RegisterService } from './register';
import { LoginService } from './login';
import { EmailConfirmationService } from './email-confirmation';

import { AuthController } from './auth.controller';

@Module({
  imports: [
    ProviderModule.registerAsync({
      imports: [ConfigModule],
      useFactory: getProvidersConfig,
      inject: [ConfigService],
    }),
    GoogleRecaptchaModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getRecaptchaConfig,
      inject: [ConfigService],
    }),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RegisterService,
    LoginService,
    UserService,
    SessionService,
    EmailConfirmationService,
  ],
})
export class AuthModule {}
