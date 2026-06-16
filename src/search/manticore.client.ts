import { Injectable, Logger } from '@nestjs/common';

interface ManticoreSqlResult {
  data?: Array<Record<string, string>>;
  error?: string;
}

@Injectable()
export class ManticoreClient {
  private readonly logger = new Logger(ManticoreClient.name);

  sqlUrl = '';
  available = false;
  private lastConnectAttempt = 0;
  private static readonly RETRY_INTERVAL_MS = 60_000;

  init(host: string, port: string): void {
    this.sqlUrl = `http://${host}:${port}/sql?mode=raw`;
  }

  async run(sql: string): Promise<Array<Record<string, string>>> {
    const response = await fetch(this.sqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: sql,
    });
    const [result] = (await response.json()) as ManticoreSqlResult[];
    if (result?.error) throw new Error(result.error);
    return result?.data ?? [];
  }

  esc(value: string): string {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }

  async tryConnect(): Promise<boolean> {
    this.lastConnectAttempt = Date.now();
    try {
      await fetch(this.sqlUrl, { method: 'POST', body: 'SELECT 1' });
    } catch {
      this.logger.warn('Manticore Search unavailable — full-text search disabled');
      return false;
    }
    this.available = true;
    this.logger.log('Manticore Search connected');
    return true;
  }

  shouldRetry(): boolean {
    return (
      !this.available &&
      Date.now() - this.lastConnectAttempt >= ManticoreClient.RETRY_INTERVAL_MS
    );
  }
}
