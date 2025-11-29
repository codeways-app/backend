import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ProviderOptionsSymbol, type TypeOptions } from './constants';
import { BaseOAuthService } from './services/base-oauth.service';

@Injectable()
export class ProviderService implements OnModuleInit {
  public constructor(
    @Inject(ProviderOptionsSymbol) private readonly options: TypeOptions,
  ) {}

  public onModuleInit() {
    const services = Array.isArray(this.options?.services)
      ? this.options.services
      : [];
    for (const provider of services) {
      provider.baseUrl = this.options.baseUrl;
    }
  }

  public findByService(service: string): BaseOAuthService | null {
    return this.options.services.find((s) => s.name === service) ?? null;
  }
}
