import { ApiProperty } from '@nestjs/swagger';
import { ChatItemDto } from './chat-item.dto';

export class ChatListResponseDto {
  @ApiProperty({ type: [ChatItemDto] })
  chats: ChatItemDto[];
}
