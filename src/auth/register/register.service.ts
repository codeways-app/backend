import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { AuthMethod, TokenType } from '../../../generated/prisma';

import { UserService } from '../../user';
import { SessionService } from '../../session';

import { EmailConfirmationService } from '../email-confirmation';

import { EmailDto, RegisterDto, VerifyDto } from './dto';

@Injectable()
export class RegisterService {
  public constructor(
    private readonly emailConfirmationService: EmailConfirmationService,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {}

  // --- SEND VERIFICATION TOKEN ---
  public async sendVerificationToken(dto: EmailDto) {
    await this.emailConfirmationService.generateToken(
      dto.email,
      TokenType.VERIFICATION,
    );
    await this.emailConfirmationService.sendToken(
      dto.email,
      TokenType.VERIFICATION,
    );

    return { message: 'Verification code was sent to email.' };
  }

  public async verifyEmail(dto: VerifyDto) {
    await this.emailConfirmationService.isTokenMatch(
      dto.email,
      dto.token,
      TokenType.VERIFICATION,
    );

    return { message: 'Email successfully verified.' };
  }

  public async register(dto: RegisterDto) {
    const isLoginExists = await this.userService.findByLogin(dto.login);

    if (isLoginExists) {
      throw new ConflictException('Login already exists');
    }

    const isEmailVerified = await this.emailConfirmationService.isTokenMatch(
      dto.email,
      dto.token,
      TokenType.VERIFICATION,
    );

    if (!isEmailVerified) {
      throw new BadRequestException('Token is expired');
    }

    await this.emailConfirmationService.deleteToken(
      dto.email,
      TokenType.VERIFICATION,
    );

    const newUser = await this.userService.create(
      dto.login,
      dto.email,
      dto.password,
      '',
      AuthMethod.CREDENTIALS,
    );

    return {
      accessToken: await this.sessionService.encrypt({
        sub: newUser.id,
        login: newUser.login,
        email: newUser.email,
        role: newUser.role,
      }),
    };
  }
}
