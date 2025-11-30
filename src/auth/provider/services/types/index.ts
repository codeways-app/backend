export type TypeProviderOptions = {
  scopes: string[];
  cliend_id: string;
  client_secret: string;
};

export type TypeBaseProviderOptions = {
  name?: string;
  authorize_url?: string;
  access_url?: string;
  profile_url?: string;
  scopes: string[];
  client_id: string;
  client_secret: string;
};

export type TypeUserInfo = {
  id: string;
  picture: string;
  name: string;
  email: string;
  access_token?: string | null;
  refresh_token?: string;
  expires_at?: number;
  provider: string;
};
