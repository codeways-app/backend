import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { RegisterDto } from './dto';
import { LoginDto } from './dto';

import { UserService } from '../user/user.service';
import { AuthMethod } from '../../generated/prisma';

import { verify } from 'argon2';

@Injectable()
export class AuthService {
  public constructor(private readonly userService: UserService) {}

  public async register(dto: RegisterDto) {
    const isExists = await this.userService.findByLogin(dto.email);
    if (isExists) {
      throw new ConflictException('User already exists');
    }

    const newUser = await this.userService.create(
      dto.login,
      dto.email,
      dto.password,
      '',
      AuthMethod.CREDENTIALS,
      false,
    );

    return newUser;
  }

  public async login(dto: LoginDto) {
    const user = await this.userService.findByLogin(dto.login);

    if (!user || !user.password) {
      throw new NotFoundException('User not found');
    }

    const isValidPassword = await verify(user.password, dto.password);

    if (!isValidPassword) {
      throw new UnauthorizedException(
        'Wrong password. Try again or reset your pasword',
      );
    }

    return console.log(user);
  }
}
