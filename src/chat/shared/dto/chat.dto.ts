import { ApiProperty } from '@nestjs/swagger';
import { MessageDto } from './message.dto';

export class ChatResponseDto {
  @ApiProperty()
  chatName: string;

  @ApiProperty()
  additionalInfo: string;

  @ApiProperty({ type: [MessageDto] })
  messages: MessageDto[];
}
