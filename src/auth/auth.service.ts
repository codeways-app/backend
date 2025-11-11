import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { UserService } from '../user/user.service';
import { AuthMethod, User } from '../../generated/prisma';
import { LoginDto } from './dto/login.dto';
import { verify } from 'argon2';

@Injectable()
export class AuthService {
  public constructor(private readonly userService: UserService) {}

  public async register(dto: RegisterDto) {
    const isExists = await this.userService.findByLogin(dto.email);
    if (isExists) {
      throw new ConflictException('user already exists');
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
        'Not true password. Try again or resetpasword',
      );
    }

    return this.sessionSave(user);
  }

  public async logout() {}

  private sessionSave(user: User) {
    return console.log(user);
  }
}
