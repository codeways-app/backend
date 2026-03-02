import { ApiProperty } from '@nestjs/swagger';

import { ContentType, MessageStatusType } from '../../../../generated/prisma';

export class MessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ enum: ContentType })
  type: ContentType;

  @ApiProperty()
  senderId: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt?: string;

  @ApiProperty()
  replyToId?: string;

  @ApiProperty({ enum: MessageStatusType })
  status: MessageStatusType;
}
