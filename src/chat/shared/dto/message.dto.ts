import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ContentType } from '../../../../generated/prisma';

export class MessageDto {
  @ApiProperty()
  content: string;

  @ApiProperty()
  type: ContentType;

  @ApiPropertyOptional()
  replyToId?: string;
}
