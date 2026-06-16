import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { ManticoreClient } from './manticore.client';

@Injectable()
export class SearchIndexer {
  private readonly logger = new Logger(SearchIndexer.name);

  constructor(
    private readonly client: ManticoreClient,
    private readonly prisma: PrismaService,
  ) {}

  async ensureTable(): Promise<void> {
    try {
      await this.client.run('DROP TABLE IF EXISTS messages_search');
      await this.client.run(
        'CREATE TABLE messages_search (message_id string, chat_id string, content text) ' +
          "morphology='stem_en,stem_ru' " +
          "min_infix_len='2' " +
          "charset_table='0..9, A..Z->a..z, a..z, U+410..U+42F->U+430..U+44F, U+430..U+44F, U+401->U+451, U+451'",
      );
      this.logger.log('Manticore table ready');
    } catch (err) {
      this.logger.error('Failed to create Manticore table', err);
    }
  }

  async reindexAll(): Promise<void> {
    try {
      const messages = await this.prisma.message.findMany({
        select: { id: true, chatId: true, content: true },
      });
      for (const msg of messages) {
        await this.indexRaw(msg.id, msg.chatId, msg.content);
      }
      this.logger.log(`Indexed ${messages.length} messages into Manticore`);
    } catch (err) {
      this.logger.error('Manticore reindex failed', err);
    }
  }

  async indexMessage(messageId: string, chatId: string, content: string): Promise<void> {
    if (!this.client.available) return;
    try {
      await this.indexRaw(messageId, chatId, content);
    } catch (err) {
      this.logger.warn(`Failed to index message ${messageId}`, err);
    }
  }

  private async indexRaw(messageId: string, chatId: string, content: string): Promise<void> {
    await this.client.run(
      `INSERT INTO messages_search (message_id, chat_id, content) VALUES (${this.client.esc(messageId)}, ${this.client.esc(chatId)}, ${this.client.esc(content)})`,
    );
  }
}
