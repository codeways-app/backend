import { User } from '../../../../generated/prisma';

export type UserBasicInfo = Pick<User, 'id' | 'login' | 'name' | 'picture'>;
