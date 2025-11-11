import { ConflictException, Injectable } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { UserService } from '../user/user.service';
import { AuthMethod } from '../../generated/prisma';

@Injectable()
export class AuthService {
  public constructor(private readonly userService: UserService) {}

  public async register(dto: RegisterDto) {
    const isExists = await this.userService.findByEmail(dto.email);
    if (isExists) {
      throw new ConflictException('user already exists');
    }

    const newUser = await this.userService.create(
      dto.email,
      dto.password,
      dto.name,
      '',
      AuthMethod.CREDENTIALS,
      false,
    );

    return newUser;
  }

  public async login() {}

  public async logout() {}

  private async sessionSave() {}
}
