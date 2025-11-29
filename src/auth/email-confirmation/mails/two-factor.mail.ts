export const twoFactorTitle = 'Ваш код двухфакторной аутентификации';

export const twoFactorMessage = (token: string | undefined) => `
<div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 40px 20px">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1)">
    <h1 style="text-align: center; color: #333333">
      Подтверждение входа
    </h1>
    <p style="text-align: center; color: #555555; font-size: 16px; line-height: 1.5">
      Вы пытаетесь войти в свой аккаунт.
    </p>
    <p style="text-align: center; color: #555555; font-size: 16px; line-height: 1.5">
      Для подтверждения личности используйте этот код:
    </p>
     <div align="center" style="font-size: 32px; padding: 12px">
            ${token}
    </div>
    <p style="text-align: center; color: #555555; font-size: 16px; line-height: 1.5">
      Введите его в приложении, чтобы продолжить.
    </p>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0">
    <small style="display: block; text-align: center; color: #999999">
      Если это были не вы, немедленно смените пароль.
    </small>
  </div>
</div>
`;
