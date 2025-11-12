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
      include: {
        accounts: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  public async findByLogin(login: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        login,
      },
      include: {
        accounts: true,
      },
    });
    return user;
  }

  public async create(
    login: string,
    email: string,
    password: string,
    picture: string,
    method: AuthMethod,
    isVerified: boolean,
  ) {
    const user = await this.prismaService.user.create({
      data: {
        login,
        email,
        password: password ? await hash(password) : '',
        picture,
        method,
        isVerified,
      },
      include: {
        accounts: true,
      },
    });
    return user;
  }
}
