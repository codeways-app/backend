import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

import { TokensResponse } from './types';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  public constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User registration' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 200,
    type: TokensResponse,
    description: 'User successful registered',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  public async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    type: TokensResponse,
    description: 'User successful autheticated',
  })
  @ApiResponse({
    status: 401,
    description: 'Wrong user credentials',
  })
  public async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
