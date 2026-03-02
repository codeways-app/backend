import { ApiProperty } from '@nestjs/swagger';
import { MessageResponseDto } from './message-response.dto';

export class ChatDto {
  @ApiProperty()
  title: string;

  @ApiProperty()
  additionalInfo: string;

  @ApiProperty({ type: [MessageResponseDto] })
  messages: MessageResponseDto[];
}
