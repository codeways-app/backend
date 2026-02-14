import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../../generated/prisma';
import { Request } from 'express';

export class TokensResponse {
  @ApiProperty({ description: 'JWT token' })
  accessToken: string;
}

export interface RequestWithCookies extends Request {
  cookies: Record<string, string>;
}

export interface RequestWithUser extends RequestWithCookies {
  user: User;
}
