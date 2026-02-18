/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { TypeBaseProviderOptions, TypeUserInfo } from './types';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BaseOAuthService {
  private readonly logger = new Logger(BaseOAuthService.name);
  private BASE_URL: string;

  public constructor(
    private readonly options: TypeBaseProviderOptions,
    private readonly configService: ConfigService,
  ) {}

  protected async extractUserInfo(data: any): Promise<TypeUserInfo> {
    return {
      ...data,
      provider: this.options.name,
    };
  }

  public getAuthUrl() {
    const query = new URLSearchParams({
      response_type: 'code',
      client_id: this.options.client_id,
      redirect_uri: this.getRedirectUrl(),
      scope: (this.options.scopes ?? []).join(' '),
      access_type: 'offline',
      prompt: 'select_account',
    });

    return `${this.options.authorize_url}?${query}`;
  }

  public async findUserByCode(code: string): Promise<TypeUserInfo> {
    const client_id = this.options.client_id;
    const client_secret = this.options.client_secret;

    const tokenQuery = new URLSearchParams({
      client_id,
      client_secret,
      code,
      redirect_uri: this.getRedirectUrl(),
      grant_type: 'authorization_code',
    });

    if (!this.options.access_url) {
      this.logger.error('Access URL is not defined');
      throw new Error('Access URL is not defined');
    }

    const tokenRequest = await fetch(this.options.access_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: tokenQuery,
    });

    if (!tokenRequest.ok) {
      this.logger.error(`Failed to get user with ${this.options.profile_url}`);
      throw new BadRequestException(
        `Failed to get user with ${this.options.profile_url}`,
      );
    }

    const tokens = await tokenRequest.json();

    if (!tokens.access_token) {
      this.logger.error(
        `Access token for ${this.options.profile_url} not found`,
      );
      throw new BadRequestException(
        `Access token for ${this.options.profile_url} not found`,
      );
    }

    if (!this.options.profile_url) {
      this.logger.error('Profile URL is not defined');
      throw new Error('Profile URL is not defined');
    }

    const userRequest = await fetch(this.options.profile_url, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });
    if (!userRequest.ok) {
      this.logger.error(
        `Failed to get user info from ${this.options.profile_url}`,
      );
      throw new UnauthorizedException(
        `Failed to get user info from ${this.options.profile_url}`,
      );
    }
    const user = await userRequest.json();
    const userData = await this.extractUserInfo(user);

    return {
      ...userData,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at || tokens.expires_in,
      provider: this.options.name ?? '',
    };
  }

  public getRedirectUrl(): string {
    const APP_URL = this.configService.getOrThrow<string>('APPLICATION_URL');

    return `${APP_URL}/api/auth/oauth/callback/${this.options.name}`;
  }

  set baseUrl(value: string) {
    this.BASE_URL = value;
  }

  get name() {
    return this.options.name;
  }

  get acces_url() {
    return this.options.access_url;
  }

  get profile_url() {
    return this.options.profile_url;
  }

  get scopes() {
    return this.options.scopes;
  }
}
