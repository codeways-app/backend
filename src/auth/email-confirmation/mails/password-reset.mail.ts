export const passwordResetTitle = 'Код для сброса пароля';

export const passwordResetMessage = (token: string | undefined) => `
  <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 40px 20px">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1)">
    <h1 style="text-align: center; color: #333333">
      Сброс пароля
    </h1>
    <p style="text-align: center; color: #555555; font-size: 16px; line-height: 1.5">
      Вы запросили сброс пароля для вашего аккаунта.
    </p>
    <p style="text-align: center; color: #555555; font-size: 16px; line-height: 1.5">
      Используйте этот код для подтверждения действия:
    </p>
        <div align="center" style="font-size: 32px; padding: 12px">
            ${token}
    </div>
    <p style="text-align: center; color: #555555; font-size: 16px; line-height: 1.5">
      Введите его в приложении, чтобы задать новый пароль.
    </p>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0">
    <small style="display: block; text-align: center; color: #999999">
      Если вы не инициировали сброс пароля, немедленно смените пароль или свяжитесь с поддержкой.
    </small>
  </div>
</div>
`;
