import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { AuthMethod } from '../../../generated/prisma';
import { UserService } from '../../user';
import { SessionService } from '../../session';

import { EmailConfirmationService } from '../email-confirmation';
import { EmailDto, RegisterDto, VerifyDto } from '../dto';

@Injectable()
export class RegisterService {
  public constructor(
    private readonly emailConfirmationService: EmailConfirmationService,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {}

  public async sendCode(dto: EmailDto) {
    await this.emailConfirmationService.generateVerificationToken(dto.email);
    await this.emailConfirmationService.sendRegisterToken(dto.email);

    return { message: 'Verification code was sent to email.' };
  }

  public async verifyEmail(dto: VerifyDto) {
    await this.emailConfirmationService.isVerificationTokenMatch(dto);

    return { message: 'Email successfully verified.' };
  }

  public async register(dto: RegisterDto) {
    const isLoginExists = await this.userService.findByLogin(dto.login);
    const isEmailVerified =
      await this.emailConfirmationService.isVerificationTokenMatch({
        email: dto.email,
        token: dto.token,
      });

    if (isLoginExists) {
      throw new ConflictException('Login already exists');
    }

    if (!isEmailVerified) {
      throw new BadRequestException('Token is expired');
    }

    await this.emailConfirmationService.deleteisVerificationToken(dto.email);

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
