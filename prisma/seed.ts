import {
  PrismaClient,
  AuthMethod,
  UserRole,
  ChatType,
  MessageStatusType,
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

interface MessageConfig {
  sender: string;
  content: string;
  statuses: { user: string; status: MessageStatusType }[];
}

interface ChatConfig {
  id: string;
  type: ChatType;
  title: string;
  members: string[];
  messages: MessageConfig[];
}

const chatsToSeed: ChatConfig[] = [
  {
    id: '6f5c8a41-3b9e-4c7a-9d2f-1a5b8e9d3c4e',
    type: ChatType.PRIVATE,
    title: 'Private: Admin & Spasontis',
    members: ['administrator', 'spasontis'],
    messages: [
      {
        sender: 'administrator',
        content: 'Hi! How are you?',
        statuses: [{ user: 'spasontis', status: MessageStatusType.READ }],
      },
      {
        sender: 'spasontis',
        content: 'Hi, I am fine! How are you?',
        statuses: [{ user: 'administrator', status: MessageStatusType.READ }],
      },
      {
        sender: 'administrator',
        content: 'I am fine too. Ready to work on the project?',
        statuses: [{ user: 'spasontis', status: MessageStatusType.SENT }],
      },
    ],
  },
  {
    id: 'd9e1f2a3-b4c5-4d6e-8f90-a1b2c3d4e5f6',
    type: ChatType.GROUP,
    title: 'Project Discussion',
    members: ['administrator', 'spasontis'],
    messages: [
      {
        sender: 'administrator',
        content: 'Welcome to the project group!',
        statuses: [{ user: 'spasontis', status: MessageStatusType.READ }],
      },
    ],
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
      if (user.login) {
        createdUsers[user.login] = createdUser.id;
      }
      console.log(`User created: ${user.login}`);
    } catch (e) {
      console.error(`Error seeding user ${user.login}:`, e);
    }
  }

  for (const chatCfg of chatsToSeed) {
    for (const login of chatCfg.members) {
      if (!createdUsers[login]) {
        console.error(`User ${login} not found for chat ${chatCfg.id}`);
      }
    }

    const chat = await prisma.chat.upsert({
      where: { id: chatCfg.id },
      update: {
        title: chatCfg.title,
        type: chatCfg.type,
      },
      create: {
        id: chatCfg.id,
        type: chatCfg.type,
        title: chatCfg.title,
        members: {
          create: chatCfg.members
            .filter((login) => createdUsers[login])
            .map((login) => ({
              userId: createdUsers[login],
            })),
        },
      },
    });
    console.log(`Chat ready: ${chat.title || chat.id} (${chat.type})`);

    for (const msg of chatCfg.messages) {
      const senderId = createdUsers[msg.sender];
      if (!senderId) {
        console.error(
          `Sender ${msg.sender} not found for message in chat ${chat.id}`,
        );
        continue;
      }

      await prisma.message.create({
        data: {
          chatId: chat.id,
          senderId: senderId,
          content: msg.content,
          statuses: {
            create: msg.statuses
              .filter((s) => createdUsers[s.user])
              .map((s) => ({
                userId: createdUsers[s.user],
                status: s.status,
              })),
          },
        },
      });
    }
    console.log(`Messages seeded for chat: ${chat.title || chat.id}`);
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
