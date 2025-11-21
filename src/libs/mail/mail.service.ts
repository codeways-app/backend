/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend: Resend;

  constructor(private configService: ConfigService) {
    const key = this.configService.getOrThrow<string>('RESEND_TOKEN');

    this.resend = new Resend(key) as Resend;
  }

  async sendToken(
    to: string,
    subject: string,
    html: string,
  ): Promise<{ id: string; object: string }> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const result = await this.resend.emails.send({
      from: 'Codeways Support <support@codeways.online>',
      to,
      subject,
      html,
    });
    return result as unknown as { id: string; object: string };
  }
}
