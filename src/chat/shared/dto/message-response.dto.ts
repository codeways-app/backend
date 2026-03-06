import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ContentType, MessageStatusType } from '../../../../generated/prisma';

import { MessageSenderDto } from './message-sender.dto';

export class MessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ enum: ContentType })
  type: ContentType;

  @ApiProperty()
  sender: MessageSenderDto;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional({ enum: MessageStatusType })
  status?: MessageStatusType;

  @ApiPropertyOptional()
  replyToId?: string;
}
