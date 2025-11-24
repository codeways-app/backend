import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Recaptcha } from '@nestlab/google-recaptcha';

import { RegisterService, EmailDto, RegisterDto, VerifyDto } from './register';
import { LoginService, LoginDto, TwoFactorDto } from './login';

import { TokensResponse } from './types';

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
  public async sendVerificationToken(@Body() dto: EmailDto) {
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
    description: 'Account successfully registered',
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
    description: 'User successful logined',
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
  @ApiOperation({ summary: 'Two-Factor Verification' })
  @ApiBody({ type: LoginDto })
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
