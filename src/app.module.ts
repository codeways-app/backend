import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';

import { IS_DEV_ENV } from './libs/common/utils/is-dev.util';
import { MailModule } from './libs/mail';

import {
  AuthModule,
  EmailConfirmationModule,
  LoginModule,
  ProviderModule,
  RecoverModule,
  RegisterModule,
} from './auth';

import { ChatModule } from './chat';
import { EmojiModule } from './emoji';
import { SearchModule } from './search';
import { SessionModule } from './session';
import { UserModule } from './user';

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: !!IS_DEV_ENV,
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    SessionModule,
    MailModule,
    EmailConfirmationModule,
    RegisterModule,
    LoginModule,
    ProviderModule,
    RecoverModule,
    ChatModule,
    EmojiModule,
    SearchModule,
  ],
})
export class AppModule {}
