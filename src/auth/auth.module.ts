import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoogleRecaptchaModule } from '@nestlab/google-recaptcha';

import { ProviderModule } from './provider';
import { MailModule } from '../libs/mail';

import { getProvidersConfig } from '../configs/providers';
import { getRecaptchaConfig } from '../configs/recaptcha';

import { AuthController } from './auth.controller';
import { AuthGuard } from './shared/guards/auth.guard';

import { UserService } from '../user';
import { SessionService } from '../session';
import { EmailConfirmationService } from './email-confirmation';
import { OAuthService } from './oauth';
import { RegisterService } from './register';
import { LoginService } from './login';
import { RecoverService } from './recover';

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
    OAuthService,
    RegisterService,
    LoginService,
    UserService,
    SessionService,
    EmailConfirmationService,
    RecoverService,
    AuthGuard,
  ],
  exports: [SessionService, AuthGuard],
})
export class AuthModule {}
