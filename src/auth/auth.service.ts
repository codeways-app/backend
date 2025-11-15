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
import { SessionService } from '../session/session.service';

@Injectable()
export class AuthService {
  public constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {}

  public async register(dto: RegisterDto) {
    const isLoginExists = await this.userService.findByLogin(dto.login);
    const isEmailExists = await this.userService.findByEmail(dto.email);

    if (isLoginExists) {
      throw new ConflictException('Login already exists');
    }
    if (isEmailExists) {
      throw new ConflictException('Email already exists');
    }

    const newUser = await this.userService.create(
      dto.login,
      dto.email,
      dto.password,
      '',
      AuthMethod.CREDENTIALS,
      false,
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

    return {
      accessToken: await this.sessionService.encrypt({
        sub: user.id,
        login: user.login,
        email: user.email,
        role: user.role,
      }),
    };
  }
}
