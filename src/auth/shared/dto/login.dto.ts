import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

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
