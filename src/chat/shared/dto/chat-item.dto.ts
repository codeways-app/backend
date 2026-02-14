import { ApiProperty } from '@nestjs/swagger';
import { LastMessageDto } from './last-message.dto';

export class ChatItemDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: LastMessageDto })
  lastMessage: LastMessageDto;

  @ApiProperty()
  unreadCount: number;
}
