import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'user',
    description: 'User login',
  })
  @IsString({ message: 'Login must be a string' })
  @IsNotEmpty({ message: 'Login is required' })
  login: string;

  @ApiProperty({
    example: 'password',
    description: 'User password',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}

export class TwoFactorDto {
  @ApiProperty({
    example: 'user',
    description: 'User login',
  })
  @IsString({ message: 'Login must be a string' })
  @IsNotEmpty({ message: 'Login is required' })
  login: string;

  @ApiProperty({
    example: '665092',
    description: 'Two-Factor Token',
  })
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token is required' })
  @Length(6, 6, { message: 'Token must be 6 characters long' })
  token: string;
}
