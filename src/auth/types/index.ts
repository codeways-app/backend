import { ApiProperty } from '@nestjs/swagger';

export class TokensResponse {
  @ApiProperty({ description: 'JWT token' })
  accessToken: string;
}
