import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class PublicUserResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  login?: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  avatar?: string;
}
