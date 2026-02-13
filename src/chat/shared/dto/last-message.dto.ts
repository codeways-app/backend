import { ApiProperty } from '@nestjs/swagger';
import { MessageStatus } from './message-status.enum';

export class LastMessageDto {
  @ApiProperty()
  text: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt?: string;

  @ApiProperty()
  senderId: string;

  @ApiProperty({ enum: MessageStatus })
  status: MessageStatus;
}
