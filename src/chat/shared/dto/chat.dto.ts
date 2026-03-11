import { ApiProperty } from '@nestjs/swagger';

import { MessageResponseDto } from './message-response.dto';

export class ChatResponseDto {
  @ApiProperty()
  title: string;

  @ApiProperty()
  additionalInfo: string;

  @ApiProperty()
  picture: string;

  @ApiProperty({ type: [MessageResponseDto] })
  messages: MessageResponseDto[];
}
