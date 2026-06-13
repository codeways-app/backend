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
  {
    id: '33cd9b5d-3e49-4911-8994-9941c0c6dd6d',
    login: 'testuser',
    email: 'testuser@codeways.online',
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
    members: ['administrator', 'spasontis', 'testuser'],
    messages: [
      {
        sender: 'administrator',
        content: 'Welcome to the project group!',
        statuses: [
          { user: 'spasontis', status: MessageStatusType.READ },
          { user: 'testuser', status: MessageStatusType.SENT },
        ],
      },
    ],
  },
];

function escSql(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

const manticoreSqlUrl = `http://${process.env.MANTICORE_HOST || '127.0.0.1'}:${process.env.MANTICORE_HTTP_PORT || '9308'}/sql?mode=raw`;

interface ManticoreSqlResult {
  data?: Array<Record<string, string>>;
  error?: string;
}

// Manticore HTTP /sql endpoint expects raw SQL text in the request body
async function runManticoreSql(sql: string): Promise<void> {
  const response = await fetch(manticoreSqlUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: sql,
  });

  const [result] = (await response.json()) as ManticoreSqlResult[];
  if (result?.error) {
    throw new Error(result.error);
  }
}

async function seedManticore() {
  try {
    await runManticoreSql('DROP TABLE IF EXISTS messages_search');
    await runManticoreSql(
      "CREATE TABLE messages_search (message_id string, chat_id string, content text) " +
        "morphology='stem_en,stem_ru' " +
        "charset_table='0..9, A..Z->a..z, a..z, U+410..U+42F->U+430..U+44F, U+430..U+44F, U+401->U+451, U+451'",
    );

    const messages = await prisma.message.findMany({
      select: { id: true, chatId: true, content: true },
    });

    for (const msg of messages) {
      await runManticoreSql(
        `INSERT INTO messages_search (message_id, chat_id, content) VALUES (${escSql(msg.id)}, ${escSql(msg.chatId)}, ${escSql(msg.content)})`,
      );
    }

    console.log(`Manticore index seeded with ${messages.length} messages`);
  } catch (e) {
    console.warn('Manticore is not reachable, skipping search index seed:', e);
  }
}

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
        members: {
          deleteMany: {},
          create: chatCfg.members
            .filter((login) => createdUsers[login])
            .map((login) => ({
              userId: createdUsers[login],
            })),
        },
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

    // Clear existing messages for this chat to avoid duplicates when re-seeding
    await prisma.messageStatus.deleteMany({
      where: { message: { chatId: chat.id } },
    });
    await prisma.message.deleteMany({ where: { chatId: chat.id } });

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

  await seedManticore();
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
