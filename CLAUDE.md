# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in the `backend/` package.

## Commands

```bash
npm run start:dev      # Dev server with watch (localhost:3000)
npm run build          # Compile TypeScript to dist/
npm run lint           # ESLint --fix
npm run format         # Prettier format
npm run db:push        # Apply Prisma schema to PostgreSQL
npm run db:reset       # Reset migrations
npm run db:seed        # Seed database
npm run db:regen       # Reset + push + seed combined
npm test               # Jest tests (*.spec.ts)
npm run test:watch     # Jest tests in watch mode
```

Swagger docs at `http://localhost:3000/api-docs` during development.

## Architecture (NestJS)

Feature modules under `src/`:

- `auth/` — Auth flows: login, register, email-confirmation, recover, oauth (Google/Yandex), with guards and DTOs in `shared/`
- `chat/` — WebSocket-based real-time messaging via Socket.io, including file attachments
- `user/` — User management
- `session/` — JWT session service
- `search/` — Full-text chat/message search via Manticore
- `libs/` — Cross-cutting utilities (mail via Resend, common helpers)
- `configs/` — OAuth providers, reCAPTCHA config
- `prisma/` — Prisma schema + migrations (PostgreSQL)

Entry point `main.ts` configures global validation pipes, Swagger, and CORS.

## Search (Manticore)

`search/` indexes message content into [Manticore Search](https://manticoresearch.com/) and queries it for full-text search, combined with chat title matches from PostgreSQL. On startup it (re)creates the `messages_search` table and reindexes all messages.

Connects via the HTTP `/sql` endpoint at `http://${MANTICORE_HOST}:${MANTICORE_HTTP_PORT}` (defaults to `127.0.0.1:9308`). Run it locally with:

```bash
docker run -p 9308:9308 manticoresearch/manticore
```

## Database (Prisma)

Key models: `User` (auth method, 2FA, role), `Account` (OAuth tokens), `Token` (verification/reset), `Chat`, `ChatMember` (tracks `lastReadAt` for read receipts/unread counts), `Message` (TEXT/IMAGE/VIDEO/FILE, with file metadata and content hash for deduplication).

## Environment Setup

Copy `.env.example` to `.env` and fill in:

- `DATABASE_URL` (PostgreSQL)
- OAuth keys (Google, Yandex)
- `RESEND_TOKEN`
- reCAPTCHA secret
- `MANTICORE_HOST` / `MANTICORE_HTTP_PORT` (optional, defaults to `127.0.0.1` / `9308`)

## Conventions

- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, etc.). When a commit body is needed, write it as a `-` bullet list (one line per change), not prose paragraphs.
- **Formatting:** Prettier (single quotes, trailing commas `all`)
- **ESLint:** Flat config (`eslint.config.mjs`); floating promises are warned; `*.spec.ts` files relax the `no-unsafe-*` rules
- **TypeScript:** Strict null checks
