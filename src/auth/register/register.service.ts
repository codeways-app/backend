import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AuthMethod, TokenType } from '../../../generated/prisma';

import { UserService } from '../../user';
import { SessionService } from '../../session';

import { EmailDto, VerifyDto, RegisterDto } from '../shared/dto';

import { EmailConfirmationService } from '../email-confirmation';

@Injectable()
export class RegisterService {
  private readonly logger = new Logger(RegisterService.name);

  public constructor(
    private readonly emailConfirmationService: EmailConfirmationService,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {}

  public async sendVerificationToken(dto: EmailDto) {
    const isEmailExists = await this.userService.findByEmail(dto.email);

    if (isEmailExists) {
      this.logger.error(`Email ${dto.email} already exists`);
      throw new ConflictException('Email already exists');
    }

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
      this.logger.error(`Login ${dto.login} already`);
      throw new ConflictException('Login already exists');
    }

    const isEmailVerified = await this.emailConfirmationService.isTokenMatch(
      dto.email,
      dto.token,
      TokenType.VERIFICATION,
    );

    if (!isEmailVerified) {
      this.logger.error(`Email ${dto.email} token is expired`);
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
      '',
      AuthMethod.CREDENTIALS,
    );

    this.logger.log(
      `Created new user:\n id:${newUser.id}\n login:${newUser.login}\n email:${newUser.email}`,
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
