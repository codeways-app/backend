import { ApiProperty } from '@nestjs/swagger';
import { MessageResponseDto } from './message-response.dto';

export class ChatItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: MessageResponseDto })
  lastMessage: MessageResponseDto;

  @ApiProperty()
  unreadCount: number;
}
