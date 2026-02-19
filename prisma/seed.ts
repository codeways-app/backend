import {
  PrismaClient,
  AuthMethod,
  UserRole,
  ChatType,
  MessageStatusEnum,
} from '../generated/prisma';
import { hash } from 'argon2';

const prisma = new PrismaClient();

const usersToSeed = [
  {
    id: 'ab22bcda-e2a0-48b1-b446-ee53b7166624',
    login: 'administrator',
    email: 'administator@codeways.online',
    password: 'Administator1',
    isTwoFactorEnable: true,
    method: AuthMethod.CREDENTIALS,
    role: UserRole.ADMIN,
  },
  {
    id: '22cd9b5d-3e49-4911-8994-9941c0c6dd6c',
    login: 'spasontis',
    email: 'spasontis@codeways.online',
    password: 'TestPassword1',
    isTwoFactorEnable: false,
    method: AuthMethod.CREDENTIALS,
    role: UserRole.REGULAR,
  },
];

async function main() {
  const createdUsers: Record<string, string> = {};

  for (const user of usersToSeed) {
    const hashedPassword = await hash(user.password);
    try {
      const createdUser = await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
          id: user.id,
          login: user.login,
          email: user.email,
          password: hashedPassword,
          isTwoFactorEnable: user.isTwoFactorEnable,
          method: user.method,
          role: user.role,
        },
      });
      createdUsers[user.login] = createdUser.id;
      console.log(`User created: ${user.login}`);
    } catch (e) {
      console.error(`Error seeding user ${user.login}:`, e);
    }
  }

  const adminId = createdUsers['administrator'];
  const spasontisId = createdUsers['spasontis'];

  const chat = await prisma.chat.create({
    data: {
      type: ChatType.PRIVATE,
      members: {
        create: [{ userId: adminId }, { userId: spasontisId }],
      },
    },
  });
  console.log(`Private chat created with ID: ${chat.id}`);

  const messages = [
    {
      senderId: adminId,
      content: 'Hi! How are you?',
      statuses: [{ userId: spasontisId, status: MessageStatusEnum.SENT }],
    },
    {
      senderId: spasontisId,
      content: 'Hi, I am fine! How are you?',
      statuses: [{ userId: adminId, status: MessageStatusEnum.SENT }],
    },
    {
      senderId: adminId,
      content: 'I am fine too. Ready to work on the project?',
      statuses: [{ userId: spasontisId, status: MessageStatusEnum.DELIVERED }],
    },
  ];

  for (const msg of messages) {
    await prisma.message.create({
      data: {
        chatId: chat.id,
        senderId: msg.senderId,
        content: msg.content,
        statuses: {
          create: msg.statuses,
        },
      },
    });
  }
  console.log('Messages seeded successfully');
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
