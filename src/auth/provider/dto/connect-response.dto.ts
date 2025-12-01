import { ApiProperty } from '@nestjs/swagger';

export class ConnectResponseDto {
  @ApiProperty({
    example:
      'https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=...',
  })
  url: string;
}
