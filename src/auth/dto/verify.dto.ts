import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Length } from 'class-validator';

export class VerifyDto {
  @ApiProperty({
    example: 'email',
    description: 'User email',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Must be a valid email' })
  email: string;

  @ApiProperty({
    example: 'token',
    description: 'Email token',
  })
  @IsNotEmpty({ message: 'Token is required' })
  @Length(6, 6, { message: 'Token must be 6 characters long' })
  token: string;
}
