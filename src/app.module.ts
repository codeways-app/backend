import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { IS_DEV_ENV } from './libs/common/utils/is-dev.util';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { SessionModule } from './session/session.module';
import { MailModule } from './libs/mail/mail.module';
import { EmailConfirmationModule } from './auth/email-confirmation/email-confirmation.module';
import { RegisterModule } from './auth/register/register.module';
import { LoginModule } from './auth/login/login.module';
import { ProviderModule } from './auth/provider/provider.module';
import { RecoverModule } from './auth/recover/recover.module';
import { EventsModule } from './chat/events.module';

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
    EventsModule,
  ],
})
export class AppModule {}
