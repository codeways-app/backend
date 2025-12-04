import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { verify } from 'argon2';

import { TokenType } from '../../../generated/prisma';

import { LoginDto, TwoFactorDto } from '../shared/dto';

import { SessionService } from '../../session';
import { UserService } from '../../user';

import { EmailConfirmationService } from '../email-confirmation';

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
      await this.emailConfirmationService.generateToken(
        user.email,
        TokenType.TWO_FACTOR,
      );

      await this.emailConfirmationService.sendToken(
        user.email,
        TokenType.TWO_FACTOR,
      );

      return {
        message: 'Two-Factor token sent',
      };
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

    await this.emailConfirmationService.isTokenMatch(
      user.email,
      dto.token,
      TokenType.TWO_FACTOR,
    );

    await this.emailConfirmationService.deleteToken(
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
