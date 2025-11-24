import { TokenType } from '../../../../generated/prisma';
import {
  registerTitle,
  registerMessage,
  twoFactorTitle,
  twoFactorMessage,
  passwordResetTitle,
  passwordResetMessage,
} from '../mails';

export const emailForms: Record<
  TokenType,
  { title: string; message: (token: string) => string }
> = {
  [TokenType.VERIFICATION]: {
    title: registerTitle,
    message: registerMessage,
  },
  [TokenType.TWO_FACTOR]: {
    title: twoFactorTitle,
    message: twoFactorMessage,
  },
  [TokenType.PASSWORD_RESET]: {
    title: passwordResetTitle,
    message: passwordResetMessage,
  },
};
