export const registerTitle = 'Добро пожаловать в наш сервис!';

export const registerMessage = (token: string | undefined) => `
<div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 40px 20px">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1)">
    <h1 style="text-align: center; color: #333333">
      Приветствуем!
    </h1>
    <p style="text-align: center; color: #555555; font-size: 16px; line-height: 1.5">
      Спасибо, что являетесь частью нашего сообщества.
    </p>
    <p style="text-align: center; color: #555555; font-size: 16px; line-height: 1.5">
      Чтобы завершить верификацию, используйте этот код подтверждения:
    </p>
        <div align="center" style="font-size: 32px; padding: 12px">
            ${token}
    </div>
    <p style="text-align: center; color: #555555; font-size: 16px; line-height: 1.5">
      Введите его в приложении, чтобы активировать свой аккаунт.
    </p>
    <p style="text-align: center; color: #555555; font-size: 16px; line-height: 1.5">
      Мы рады видеть вас!
    </p>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0">
    <small style="display: block; text-align: center; color: #999999">
      Если вы не регистрировались, просто проигнорируйте это письмо.
    </small>
  </div>
</div>
`;
