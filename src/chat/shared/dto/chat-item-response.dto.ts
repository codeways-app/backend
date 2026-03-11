import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { MessageResponseDto } from './message-response.dto';

export class ChatItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({ type: MessageResponseDto })
  lastMessage?: MessageResponseDto;

  @ApiPropertyOptional()
  picture?: string;

  @ApiPropertyOptional()
  unreadCount?: number;
}
