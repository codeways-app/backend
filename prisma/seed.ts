import { PrismaClient, AuthMethod, UserRole } from '../generated/prisma';
import { hash } from 'argon2';

const prisma = new PrismaClient();

const usersToSeed = [
  {
    login: 'administrator',
    email: 'administator@codeways.online',
    password: 'Administator1',
    isTwoFactorEnable: true,
    method: AuthMethod.CREDENTIALS,
    role: UserRole.ADMIN,
  },
  {
    login: 'spasontis',
    email: 'spasontis@codeways.online',
    password: 'TestPassword1',
    isTwoFactorEnable: false,
    method: AuthMethod.CREDENTIALS,
    role: UserRole.REGULAR,
  },
];

async function main() {
  for (const user of usersToSeed) {
    const hashedPassword = await hash(user.password);
    try {
      await prisma.user.create({
        data: {
          login: user.login,
          email: user.email,
          password: hashedPassword,
          isTwoFactorEnable: user.isTwoFactorEnable,
          method: user.method,
          role: user.role,
        },
      });
    } catch (e) {
      console.error(e);
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('PostgreSQL database seeded successfully');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
