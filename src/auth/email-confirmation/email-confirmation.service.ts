import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { TokenType } from '../../../generated/prisma';

import { MailService } from '../../libs/mail';
import { PrismaService } from '../../prisma';
import { UserService } from '../../user';

import { emailForms } from './forms';

@Injectable()
export class EmailConfirmationService {
  public constructor(
    private readonly mailService: MailService,
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
  ) {}

  // --- SEND TOKEN ---
  public async sendToken(email: string, tokenType: TokenType): Promise<void> {
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

    const form = emailForms[tokenType];

    await this.mailService.sendToken(
      email,
      form.title,
      form.message(tokenRecord?.token),
    );
  }

  // --- GENERATE TOKEN ---
  public async generateToken(email: string, tokenType: TokenType) {
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresIn = new Date(new Date().getTime() + 15 * 60 * 1000);
    const existingToken = await this.prismaService.token.findFirst({
      where: {
        email,
        type: tokenType,
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
        type: tokenType,
      },
    });

    return verificationToken;
  }

  // --- DELETE TOKEN ---
  public async deleteToken(email: string, tokenType: TokenType) {
    await this.prismaService.token.deleteMany({
      where: {
        email,
        type: tokenType,
      },
    });
  }

  // --- VERIFY TOKEN ---
  public async isTokenMatch(
    email: string,
    token: string,
    tokenType: TokenType,
  ) {
    const verificationToken = await this.prismaService.token.findFirst({
      where: {
        email,
        type: tokenType,
      },
    });

    if (token !== verificationToken?.token) {
      throw new BadRequestException('Verification token is invalid');
    }
    if (verificationToken.expiresIn < new Date()) {
      await this.deleteToken(email, tokenType);
      throw new BadRequestException('Verification token has expired');
    }

    return true;
  }
}
