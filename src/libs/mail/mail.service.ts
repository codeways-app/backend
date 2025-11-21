import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: Transporter;
  private from: string;

  constructor(private configService: ConfigService) {
    const host = this.configService.getOrThrow<string>('MAIL_HOST');
    const port = Number(this.configService.getOrThrow<string>('MAIL_PORT'));
    const user = this.configService.getOrThrow<string>('MAIL_USER');
    const pass = this.configService.getOrThrow<string>('MAIL_PASSWORD');
    this.from = this.configService.getOrThrow<string>('MAIL_TOKEN');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-assignment
    this.transporter = createTransport({
      host,
      port,
      secure: false,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false, // ОБЯЗАТЕЛЬНО для серверов REG.RU
      },
    });
  }

  async sendToken(to: string, subject: string, html: string): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    const info = await this.transporter.sendMail({
      from: this.from,
      to,
      subject,
      html,
    });

    return info;
  }
}
