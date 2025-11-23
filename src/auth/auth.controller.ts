import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Recaptcha } from '@nestlab/google-recaptcha';

import { RegisterService } from './register';
import { LoginService } from './login';

import { EmailDto, VerifyDto, RegisterDto, LoginDto } from './dto';
import { TokensResponse } from './types';
import { TwoFactorDto } from './dto/two-factor.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  public constructor(
    private readonly registerService: RegisterService,
    private readonly loginService: LoginService,
  ) {}

  // ─── Registration routes ───
  // ────────────────────────────────────────────────
  // STEP 1 — Send verification code to email
  // ────────────────────────────────────────────────
  @Recaptcha()
  @Post('register/send-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 1: Enter email & send verification code' })
  @ApiBody({ type: EmailDto })
  @ApiResponse({
    status: 200,
    description: 'Verification code was successfully sent to the email.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid email format.',
  })
  public async sendCode(@Body() dto: EmailDto) {
    return this.registerService.sendCode(dto);
  }

  // ────────────────────────────────────────────────
  // STEP 2 — Verify email with code
  // ────────────────────────────────────────────────
  @Recaptcha()
  @Post('register/verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 2: Verify email with received code' })
  @ApiBody({ type: VerifyDto })
  @ApiResponse({
    status: 200,
    description: 'Email successfully verified.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid verification code.',
  })
  public async verifyEmail(@Body() dto: VerifyDto) {
    return this.registerService.verifyEmail(dto);
  }

  // ────────────────────────────────────────────────
  // STEP 3 — Create account (username, password)
  // ────────────────────────────────────────────────
  @Recaptcha()
  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 3: Complete registration and create account' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 200,
    type: TokensResponse,
    description: 'Account successfully created and autheticated',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error.',
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
    description: 'User successful autheticated',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid login or password',
  })
  public async login(@Body() dto: LoginDto) {
    return this.loginService.login(dto);
  }

  @Post('login/two-factor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Two factor login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    type: TokensResponse,
    description: 'User successful autheticated',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid Two-Factor Token',
  })
  public async twoFactor(@Body() dto: TwoFactorDto) {
    return this.loginService.twoFactor(dto);
  }
}
