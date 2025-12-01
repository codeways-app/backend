/* eslint-disable @typescript-eslint/require-await */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Recaptcha } from '@nestlab/google-recaptcha';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { AuthProviderGuard } from './guards/provider.guard';
import { ConnectResponseDto } from './provider/dto';

import { AuthService } from './auth.service';
import { RegisterService, EmailDto, RegisterDto, VerifyDto } from './register';
import { LoginService, LoginDto, TwoFactorDto } from './login';
import { ProviderService } from './provider';
import { TokensResponse } from './types';
import { SessionService } from '../session';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  public constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly registerService: RegisterService,
    private readonly loginService: LoginService,
    private readonly providerService: ProviderService,
    private readonly sessionService: SessionService,
  ) {}

  // ────────────────────────────────────────────────
  // Registration — Step 1: Send verification code
  // ────────────────────────────────────────────────
  @Recaptcha()
  @Post('register/send-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 1: Enter email & send Verification Token' })
  @ApiBody({ type: EmailDto })
  @ApiResponse({
    status: 200,
    description: 'Verification Token was successfully sent to the email.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid email format.',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
  })
  public async sendRegisterVerificationToken(@Body() dto: EmailDto) {
    return this.registerService.sendVerificationToken(dto);
  }

  // ────────────────────────────────────────────────
  // Registration — Step 2: Verify email with code
  // ────────────────────────────────────────────────
  @Recaptcha()
  @Post('register/verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 2: Verify email with received Token' })
  @ApiBody({ type: VerifyDto })
  @ApiResponse({
    status: 200,
    description: 'Email successfully verified.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid verification Token.',
  })
  public async verifyEmail(@Body() dto: VerifyDto) {
    return this.registerService.verifyEmail(dto);
  }

  // ────────────────────────────────────────────────
  // Registration — Step 3: Create account (login/password)
  // ────────────────────────────────────────────────
  @Recaptcha()
  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 3: Complete registration and create account' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 200,
    type: TokensResponse,
    description: 'Account successfully registered',
  })
  @ApiResponse({
    status: 409,
    description: 'Login already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  public async register(@Body() dto: RegisterDto) {
    return this.registerService.register(dto);
  }

  // ────────────────────────────────────────────────
  // Login
  // ────────────────────────────────────────────────
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    type: TokensResponse,
    description: 'User successful logined',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid login or password',
  })
  public async login(@Body() dto: LoginDto) {
    return this.loginService.login(dto);
  }

  // ────────────────────────────────────────────────
  // Two-Factor Login
  // ────────────────────────────────────────────────
  @Post('login/two-factor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Two-Factor Verification' })
  @ApiBody({ type: TwoFactorDto })
  @ApiResponse({
    status: 200,
    type: TokensResponse,
    description: 'Two-Factor Token successful verified',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid Verification Token',
  })
  public async twoFactor(@Body() dto: TwoFactorDto) {
    return this.loginService.twoFactor(dto);
  }

  // ────────────────────────────────────────────────
  // OAuth — Connect provider
  // ────────────────────────────────────────────────
  @UseGuards(AuthProviderGuard)
  @Get('oauth/connect/:provider')
  @ApiResponse({
    status: 200,
    type: ConnectResponseDto,
    description: 'User successful logined',
  })
  public async connect(@Param('provider') provider: string) {
    const providerInstance = this.providerService.findByService(provider);

    if (!providerInstance) {
      throw new BadRequestException(`Provider "${provider}" not found`);
    }

    return {
      url: providerInstance.getAuthUrl(),
    };
  }

  // ────────────────────────────────────────────────
  // OAuth — Provider callback
  // ────────────────────────────────────────────────
  @UseGuards(AuthProviderGuard)
  @Get('oauth/callback/:provider')
  @ApiResponse({
    status: 200,
    type: TokensResponse,
    description: 'User successful logined',
  })
  public async callback(
    @Res({ passthrough: true }) res: Response,
    @Query('code') code: string,
    @Param('provider') provider: string,
  ) {
    if (!code) {
      throw new BadRequestException('Authorization code is missing');
    }

    const user = await this.authService.extractProfileFromCode(provider, code);

    const accessToken = await this.sessionService.encrypt({
      sub: user.id,
      login: user.login,
      email: user.email,
      role: user.role,
    });

    return res.redirect(
      `${this.configService.getOrThrow('ALLOWED_ORIGIN')}/oauth?accessToken=${accessToken}`,
    );
  }
}
