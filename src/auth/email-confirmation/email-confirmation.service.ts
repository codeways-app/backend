import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { MailService } from '../../libs/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenType } from '../../../generated/prisma';

import { VerifyDto } from '../dto';

import { registerMessage, registerTitle } from './messages/register.message';
import { UserService } from '../../user';
import {
  twoFactorMessage,
  twoFactorTitle,
} from './messages/two-factor.message';

@Injectable()
export class EmailConfirmationService {
  public constructor(
    private readonly mailService: MailService,
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
  ) {}

  public async sendRegisterToken(email: string): Promise<void> {
    const isEmailExists = await this.userService.findByEmail(email);

    if (isEmailExists) {
      throw new ConflictException('Email already exists');
    }

    const verificationToken = await this.prismaService.token.findFirst({
      where: {
        email,
        type: TokenType.VERIFICATION,
      },
    });

    await this.mailService.sendToken(
      email,
      registerTitle,
      registerMessage(verificationToken?.token),
    );
  }

  public async sendTwoFactorToken(email: string): Promise<void> {
    const twoFactorToken = await this.prismaService.token.findFirst({
      where: {
        email,
        type: TokenType.VERIFICATION,
      },
    });

    await this.mailService.sendToken(
      email,
      twoFactorTitle,
      twoFactorMessage(twoFactorToken?.token),
    );
  }

  public async generateVerificationToken(email: string) {
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresIn = new Date(new Date().getTime() + 15 * 60 * 1000);
    const existingToken = await this.prismaService.token.findFirst({
      where: {
        email,
        type: TokenType.VERIFICATION,
      },
    });

    if (existingToken) {
      await this.prismaService.token.delete({
        where: {
          id: existingToken.id,
        },
      });
    }

    const verificationToken = await this.prismaService.token.create({
      data: {
        email,
        token,
        expiresIn,
        type: TokenType.VERIFICATION,
      },
    });

    return verificationToken;
  }

  public async isVerificationTokenMatch(dto: VerifyDto) {
    const verificationToken = await this.prismaService.token.findFirst({
      where: {
        email: dto.email,
        type: TokenType.VERIFICATION,
      },
    });

    if (dto.token !== verificationToken?.token) {
      throw new BadRequestException('Verification token is wrong');
    }

    return dto;
  }

  public async deleteisVerificationToken(email: string) {
    await this.prismaService.token.deleteMany({
      where: {
        email,
        type: TokenType.VERIFICATION,
      },
    });
  }
}
