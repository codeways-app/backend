import { ApiProperty } from '@nestjs/swagger';
import type { MessageDto } from './message.dto';

export class SendMessageDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  chatId: string;

  @ApiProperty()
  message: MessageDto;
}
