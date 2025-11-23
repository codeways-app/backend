import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { MailService } from '../../libs/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenType } from '../../../generated/prisma';

import { VerifyDto } from '../dto';

import { registerMessage, registerTitle } from './mails/register.mail';
import { twoFactorMessage, twoFactorTitle } from './mails/two-factor.mail';
import {
  passwordResetTitle,
  passwordResetMessage,
} from './mails/password-reset.mail';

import { UserService } from '../../user';

@Injectable()
export class EmailConfirmationService {
  public constructor(
    private readonly mailService: MailService,
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
  ) {}

  private forms: Record<
    TokenType,
    { title: string; message: (token: string) => string }
  > = {
    [TokenType.VERIFICATION]: {
      title: registerTitle,
      message: (token: string) => registerMessage(token),
    },
    [TokenType.TWO_FACTOR]: {
      title: twoFactorTitle,
      message: (token: string) => twoFactorMessage(token),
    },
    [TokenType.PASSWORD_RESET]: {
      title: passwordResetTitle,
      message: (token: string) => passwordResetMessage(token),
    },
  };

  public async sendTokenByType(
    email: string,
    tokenType: TokenType,
  ): Promise<void> {
    if (tokenType === TokenType.VERIFICATION) {
      const isEmailExists = await this.userService.findByEmail(email);

      if (isEmailExists) {
        throw new ConflictException('Email already exists');
      }
    }

    const tokenRecord = await this.prismaService.token.findFirst({
      where: {
        email,
        type: tokenType,
      },
    });

    if (!tokenRecord) {
      throw new BadRequestException('Token not found');
    }

    const form = this.forms[tokenType];
    await this.mailService.sendToken(
      email,
      form.title,
      form.message(tokenRecord?.token),
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

  public async deleteVerificationToken(email: string, tokenType: TokenType) {
    await this.prismaService.token.deleteMany({
      where: {
        email,
        type: tokenType,
      },
    });
  }

  public async isVerificationTokenMatch(dto: VerifyDto, tokenType: TokenType) {
    const verificationToken = await this.prismaService.token.findFirst({
      where: {
        email: dto.email,
        type: tokenType,
      },
    });

    if (dto.token !== verificationToken?.token) {
      throw new BadRequestException('Verification token is wrong');
    }
    if (verificationToken.expiresIn < new Date()) {
      await this.deleteVerificationToken(dto.email, tokenType);
      throw new BadRequestException('Verification token has expired');
    }

    return dto;
  }
}
