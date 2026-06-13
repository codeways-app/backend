import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuthGuard } from '../auth/shared/guards/auth.guard';
import type { RequestWithUser } from '../auth/shared/types';
import { ChatItemResponseDto } from '../chat/shared/dto';

import { SearchService } from './search.service';

@ApiBearerAuth()
@ApiTags('search')
@UseGuards(AuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search chats by message content or chat title' })
  @ApiQuery({
    name: 'q',
    required: true,
    description:
      'Search query (min 2 chars). Wrap in double quotes for an exact phrase match, e.g. "How are you?"',
  })
  @ApiResponse({
    status: 200,
    type: ChatItemResponseDto,
    isArray: true,
    description: 'Chats matching the search query',
  })
  public async search(
    @Query('q') query: string,
    @Request() req: RequestWithUser,
  ): Promise<ChatItemResponseDto[]> {
    if (!query || query.trim().length < 2) return [];
    return this.searchService.search(query.trim(), req.user.id);
  }
}
