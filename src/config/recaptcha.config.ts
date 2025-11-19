import { ConfigService } from '@nestjs/config';
import { type GoogleRecaptchaModuleOptions } from '@nestlab/google-recaptcha';
import { isDev } from '../libs/common/utils/is-dev.util';

export const getRecaptchaConfig = async (
  configService: ConfigService,
  // eslint-disable-next-line @typescript-eslint/require-await
): Promise<GoogleRecaptchaModuleOptions> => ({
  secretKey: configService.getOrThrow<string>('GOOGLE_RECAPTCHA_SECRET_KEY'),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
  response: (req) => req.headers.recaptcha,
  skipIf: isDev(configService),
});
