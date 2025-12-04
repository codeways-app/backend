import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AuthMethod } from '../../generated/prisma/client';

import { hash } from 'argon2';

@Injectable()
export class UserService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async findById(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  public async findByLogin(login: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        login,
      },
    });
    return user;
  }

  public async findByEmail(email: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });
    return user;
  }

  public async create(
    login: string,
    email: string,
    password: string,
    name: string,
    picture: string,
    method: AuthMethod,
  ) {
    const user = await this.prismaService.user.create({
      data: {
        login,
        email,
        password: password ? await hash(password) : '',
        name,
        picture,
        method,
      },
      include: {
        accounts: true,
      },
    });
    return user;
  }

  public async resetPassword(email: string, newPassword: string) {
    const user = await this.prismaService.user.update({
      where: { email },
      data: {
        password: await hash(newPassword),
      },
    });

    return user;
  }
}
