/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type { Request } from 'express';

import { AuthMethod } from '../../generated/prisma';

import { PrismaService } from '../prisma';
import { UserService } from '../user';

import { ProviderService } from './provider';

export class AuthService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
    private readonly providerService: ProviderService,
  ) {}

  public async extractProfileFromCode(
    req: Request,
    provider: string,
    code: string,
  ) {
    const providerInstance = this.providerService.findByService(provider);

    if (!providerInstance) {
      throw new Error('Provider instance not found');
    }

    const profile = await providerInstance.findUserByCode(code);

    const account = await this.prismaService.account.findFirst({
      where: {
        id: profile.id,
        provider: profile.provider,
      },
    });

    let user = account?.userId
      ? await this.userService.findById(account.userId)
      : null;

    if (user) {
      return user;
    }

    user = await this.userService.create(
      profile.name,
      profile.email,
      '',
      profile.picture,
      AuthMethod[profile.provider.toUpperCase()],
    );

    if (!account) {
      await this.prismaService.account.create({
        data: {
          userId: user.id,
          type: 'oauth',
          provider: profile.provider,
          accessToken: profile.access_token,
          refreshToken: profile.refresh_token,
          expiresAt: profile.expires_at,
        },
      });
    }
    return user;
  }
}
