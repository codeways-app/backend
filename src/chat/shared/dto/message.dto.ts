import { ApiProperty } from '@nestjs/swagger';
import { MessageStatus } from './message-status.enum';

export class MessageDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  text: string;

  @ApiProperty()
  senderId: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt?: string;

  @ApiProperty({ enum: MessageStatus })
  status: MessageStatus;
}
