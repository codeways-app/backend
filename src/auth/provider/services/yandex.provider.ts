// import { ConfigService } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { BaseOAuthService } from './base-oauth.service';
import { TypeBaseProviderOptions, TypeUserInfo } from './types';

export class YandexProvider extends BaseOAuthService {
  public constructor(
    options: TypeBaseProviderOptions,
    configService: ConfigService,
  ) {
    super(
      {
        name: 'yandex',
        authorize_url: 'https://oauth.yandex.com/authorize',
        access_url: 'https://oauth.yandex.com/token',
        profile_url: 'https://login.yandex.ru/info?format=json',
        scopes: options.scopes,
        client_id: options.client_id,
        client_secret: options.client_secret,
      },
      configService,
    );
  }

  public async extractUserInfo(data: YandexProfile): Promise<TypeUserInfo> {
    return super.extractUserInfo({
      email: data.emails?.[0],
      name: data.display_name,
      picture: data.default_avatar_id
        ? `https://avatars.yandex.net/get-yapic/${data.default_avatar_id}/islands-200`
        : undefined,
    });
  }
}
interface YandexProfile {
  login: string;
  id: string;
  client_id: string;
  psuid: string;
  emails?: string[];
  default_email?: string;
  is_avatar_empty?: boolean;
  default_avatar_id?: string;
  birthday?: string | null;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  real_name?: string;
  sex?: 'male' | 'female' | null;
  default_phone?: { id: number; number: string };
  access_token: string;
  refresh_token?: string;
}
