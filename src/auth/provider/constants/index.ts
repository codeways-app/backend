import { FactoryProvider, ModuleMetadata } from '@nestjs/common';
import { BaseOAuthService } from '../services/base-oauth.service';

export const ProviderOptionsSymbol = Symbol();

export type TypeOptions = {
  baseUrl: string;
  services: BaseOAuthService[];
};

export const DEFAULT_TYPE_OPTIONS: TypeOptions = {
  baseUrl: '',
  services: [],
};

export type TypeAsyncOptions = Pick<ModuleMetadata, 'imports'> &
  Pick<FactoryProvider<TypeOptions>, 'useFactory' | 'inject'>;
