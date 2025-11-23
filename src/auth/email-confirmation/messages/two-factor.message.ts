export const twoFactorTitle = 'Ваш код двухфакторной аутентификации';

export const twoFactorMessage = (token: string | undefined) => `
  <h1>Подтверждение входа</h1>
  <p>Вы пытаетесь войти в свой аккаунт.</p>
  <p>Для подтверждения личности используйте этот код:</p>
  <h2 style="color: #2F80ED; font-size: 24px;">${token}</h2>
  <p>Введите его в приложении, чтобы продолжить.</p>
  <hr>
  <small>Если это были не вы, немедленно смените пароль.</small>
`;
