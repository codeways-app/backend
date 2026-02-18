import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TokenType, AuthMethod } from '../../../generated/prisma';

import { UserService } from '../../user';
import { EmailDto, RecoverDto, VerifyDto } from '../shared/dto';

import { EmailConfirmationService } from '../email-confirmation';

@Injectable()
export class RecoverService {
  private readonly logger = new Logger(RecoverService.name);
  public constructor(
    private readonly emailConfirmationService: EmailConfirmationService,
    private readonly userService: UserService,
  ) {}

  public async sendRecoverToken(dto: EmailDto) {
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      this.logger.error(`Email ${dto.email} does not exist`);
      throw new NotFoundException('Email does not exist');
    }

    if (user.method != AuthMethod.CREDENTIALS) {
      this.logger.error(`Email ${dto.email} logined by social`);
      throw new ConflictException('This account uses social login');
    }

    await this.emailConfirmationService.generateToken(
      dto.email,
      TokenType.PASSWORD_RESET,
    );

    await this.emailConfirmationService.sendToken(
      dto.email,
      TokenType.PASSWORD_RESET,
    );

    return { message: 'Recover code was sent to email.' };
  }

  public async verifyRecover(dto: VerifyDto) {
    await this.emailConfirmationService.isTokenMatch(
      dto.email,
      dto.token,
      TokenType.PASSWORD_RESET,
    );

    return { message: 'Recover successfully verified.' };
  }

  public async recover(dto: RecoverDto) {
    const isEmailVerified = await this.emailConfirmationService.isTokenMatch(
      dto.email,
      dto.token,
      TokenType.PASSWORD_RESET,
    );

    if (!isEmailVerified) {
      this.logger.error(`Email ${dto.email} token is expired`);
      throw new BadRequestException('Token is expired');
    }

    await this.emailConfirmationService.deleteToken(
      dto.email,
      TokenType.PASSWORD_RESET,
    );

    await this.userService.resetPassword(dto.email, dto.password);
  }
}
