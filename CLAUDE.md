# Claude Instructions for UIgen Project

## Project Overview
This is a Next.js 15 application with Prisma ORM and SQLite database for UI generation.

## Setup Commands
- `npm run setup` - Install dependencies, generate Prisma client, and run migrations
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server

## Development Workflow
- Database: SQLite with Prisma ORM
- Client: Generated at `./src/generated/prisma`
- Schema: Located at `prisma/schema.prisma`
- Environment: Variables loaded from `.env`

## Key Directories
- `/src` - Source code
- `/prisma` - Database schema and migrations
- `/src/generated/prisma` - Generated Prisma client

## Database Operations
- `npx prisma generate` - Generate Prisma client
- `npx prisma migrate dev` - Run development migrations
- `npx prisma studio` - Open Prisma Studio for database management

## Development Server
- Local: http://localhost:3000
- Network: http://172.16.4.65:3000
- Uses Turbopack for fast builds

## Claude Thinking Modes
Activate different levels of analysis using these keywords:

**Basic thinking:**
- "think" / "piensa"
- "reflexiona"

**Deep thinking:**
- "think more" / "piensa más"
- "think harder" / "piensa profundamente"
- "think deeply" / "analiza profundamente"
- "think longer" / "reflexiona más"

Useful for:
- Complex architectural decisions
- Debugging intricate issues
- Implementation planning
- Codebase analysis
- Approach evaluation

## Notes
- Always run `npm run setup` after cloning or when schema changes
- Database is already in sync (no pending migrations)
- One low severity vulnerability present (can fix with `npm audit fix`)
- Initial page compilation may take 5-6 seconds on first load