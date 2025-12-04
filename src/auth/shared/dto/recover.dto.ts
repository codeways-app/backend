import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  Matches,
  Length,
} from 'class-validator';

export class RecoverDto {
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
