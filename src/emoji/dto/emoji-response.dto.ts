import { ApiProperty } from '@nestjs/swagger';

export class EmojiResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  imageUrl: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  createdAt: string;
}
