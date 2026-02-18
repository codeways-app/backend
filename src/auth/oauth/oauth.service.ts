import { AuthMethod } from '../../../generated/prisma';

import { PrismaService } from '../../prisma';
import { UserService } from '../../user';

import { ProviderService } from '../provider/provider.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
    private readonly providerService: ProviderService,
  ) {}

  public async extractProfileFromCode(provider: string, code: string) {
    const providerInstance = this.providerService.findByService(provider);

    if (!providerInstance) {
      this.logger.error(`Provider ${provider} instance not found`);
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
      '',
      profile.email,
      '',
      profile.name,
      profile.picture,
      AuthMethod[profile.provider.toUpperCase() as AuthMethod],
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
