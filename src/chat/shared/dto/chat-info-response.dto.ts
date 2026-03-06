import { ApiProperty } from '@nestjs/swagger';

export class ChatInfoResponseDto {
  @ApiProperty()
  title: string;

  @ApiProperty()
  picture: string;

  @ApiProperty()
  additionalInfo: string;
}
