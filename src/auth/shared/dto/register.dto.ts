import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  Matches,
  IsEmail,
  Length,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'user',
    description: 'User login',
  })
  @IsString({ message: 'Login must be a string' })
  @IsNotEmpty({ message: 'Login is required' })
  @MinLength(6, {
    message: 'Login must be at least 6 characters long',
  })
  @Matches(/^[A-Za-z0-9]+$/, {
    message: 'Login may contain only Latin letters and digits',
  })
  login: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email',
  })
  @IsString({ message: 'Email must be a string' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    example: 'password',
    description: 'User password',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Password must contain lowercase and uppercase Latin letters and digits',
  })
  password: string;

  @ApiProperty({
    example: 'token',
    description: 'Register token',
  })
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token is required' })
  @Length(6, 6, { message: 'Token must be 6 characters long' })
  token: string;
}
