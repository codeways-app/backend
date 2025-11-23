import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { SessionService } from '../../session/session.service';
import { UserService } from '../../user/user.service';
import { EmailConfirmationService } from '../email-confirmation/email-confirmation.service';

import { LoginDto } from '../dto';

import { verify } from 'argon2';
import { TwoFactorDto } from '../dto/two-factor.dto';
import { TokenType } from '../../../generated/prisma';

@Injectable()
export class LoginService {
  public constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly emailConfirmationService: EmailConfirmationService,
  ) {}

  public async login(dto: LoginDto) {
    const user = await this.userService.findByLogin(dto.login);

    const invalidMsg = 'Invalid login or password';

    if (!user) {
      throw new UnauthorizedException(invalidMsg);
    }

    const isValidPassword = await verify(user.password, dto.password);

    if (!isValidPassword) {
      throw new UnauthorizedException(invalidMsg);
    }

    const isTwoFactorEnable = user.isTwoFactorEnable;

    if (isTwoFactorEnable) {
      await this.emailConfirmationService.generateVerificationToken(user.email);
      await this.emailConfirmationService.sendTokenByType(
        user.email,
        TokenType.TWO_FACTOR,
      );

      return { message: 'Two-Factor Token successful sent' };
    }

    return {
      accessToken: await this.sessionService.encrypt({
        sub: user.id,
        login: user.login,
        email: user.email,
        role: user.role,
      }),
    };
  }

  public async twoFactor(dto: TwoFactorDto) {
    const user = await this.userService.findByLogin(dto.login);

    if (!user) {
      throw new NotFoundException(`User ${dto.login} not found`);
    }

    await this.emailConfirmationService.isVerificationTokenMatch(
      {
        email: user.email,
        token: dto.token,
      },
      TokenType.TWO_FACTOR,
    );

    await this.emailConfirmationService.deleteVerificationToken(
      user.email,
      TokenType.TWO_FACTOR,
    );

    return {
      accessToken: await this.sessionService.encrypt({
        sub: user.id,
        login: user.login,
        email: user.email,
        role: user.role,
      }),
    };
  }
}
