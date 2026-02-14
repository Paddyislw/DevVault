# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DevVault is a TypeScript monorepo using Turborepo and npm. It combines a Next.js web application, a Telegram bot, and shared packages for database, types, and utilities.

## Commands

### Development
```bash
npm run dev              # Run all apps in development mode
turbo dev --filter=web   # Run only the web app
turbo dev --filter=bot   # Run only the bot
```

### Build
```bash
npm run build            # Build all apps and packages
turbo build --filter=web  # Build specific app
```

### Linting & Type Checking
```bash
npm run lint             # Lint entire monorepo
npm run check-types      # Type check all packages
npm run format           # Format code with Prettier
```

### Database (packages/db)
```bash
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:push          # Push schema changes
npm run db:studio        # Open Prisma Studio
```

## Architecture

```
apps/
  web/                # Next.js 14 frontend (port 3000)
  bot/                # Telegram bot using grammy framework
packages/
  db/                 # Prisma ORM with PostgreSQL, exports singleton PrismaClient
  types/              # Shared TypeScript interfaces
  utils/              # Shared utility functions
  ai/                 # AI integration package
```

### Key Patterns

- **Database singleton**: `packages/db` exports a global PrismaClient instance to prevent multiple connections
- **Path aliases**: Web app uses `@/*` mapping to `./src/*`
- **Prisma client location**: Generated at `packages/db/generated/prisma`

### Environment Variables

Required in `.env` (see `.env.example`):
- `BOT_TOKEN` - Telegram bot token
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Bot**: grammy (Telegram)
- **Database**: PostgreSQL with Prisma
- **Build**: Turborepo with npm workspaces
- **Node**: >=18 required
