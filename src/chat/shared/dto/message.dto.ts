import { ApiProperty } from '@nestjs/swagger';
import { ContentType } from '../../../../generated/prisma';

export class MessageDto {
  @ApiProperty()
  content: string;

  @ApiProperty()
  type: ContentType;

  @ApiProperty()
  replyToId?: string;
}
