import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../auth/shared/guards/auth.guard';

import { UserService } from './user.service';
import { PublicUserResponseDto } from './shared/dto';

@ApiBearerAuth()
@ApiTags('users')
@UseGuards(AuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get public profile by login' })
  @ApiResponse({
    status: 200,
    type: PublicUserResponseDto,
    description: 'Public user profile',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  public async getUserByLogin(
    @Param('login') login: string,
  ): Promise<PublicUserResponseDto> {
    const user = await this.userService.findByLogin(login);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      login: user.login ?? undefined,
      name: user.name ?? undefined,
      avatar: user.picture ?? undefined,
    };
  }
}
