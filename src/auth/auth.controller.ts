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
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Recaptcha } from '@nestlab/google-recaptcha';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { AuthProviderGuard } from './guards/provider.guard';

import { AuthService } from './auth.service';
import { RegisterService, EmailDto, RegisterDto, VerifyDto } from './register';
import { LoginService, LoginDto, TwoFactorDto } from './login';
import { ProviderService } from './provider';
import { TokensResponse } from './types';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  public constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly registerService: RegisterService,
    private readonly loginService: LoginService,
    private readonly providerService: ProviderService,
  ) {}

  // ─── Registration routes ───
  // ────────────────────────────────────────────────
  // STEP 1 — Send verification code to email
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
  // STEP 2 — Verify email with code
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
  // STEP 3 — Create account (login, password)
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

  // ─── Login route ───
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

  @Get('/oauth/callback/:provider')
  @UseGuards(AuthProviderGuard)
  public async callback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query('code') code: string,
    @Param('provider') provider: string,
  ) {
    if (!code) {
      throw new BadRequestException('Authorization code is missing');
    }

    await this.authService.extractProfileFromCode(req, provider, code);

    return res.redirect(
      `${this.configService.getOrThrow('ALLOWED_ORIGIN')}/dashboard`,
    );
  }

  @UseGuards(AuthProviderGuard)
  @Get('/oauth/connect/:provider')
  // eslint-disable-next-line @typescript-eslint/require-await
  public async connect(@Param('provider') provider: string) {
    const providerInstance = this.providerService.findByService(provider);

    if (!providerInstance) {
      throw new BadRequestException(`Provider "${provider}" not found`);
    }

    return {
      url: providerInstance.getAuthUrl(),
    };
  }

  // ─── Two factor route ───
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
}
