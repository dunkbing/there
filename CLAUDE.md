# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a collaborative focus room application built with Next.js that enables users to create and join virtual workspaces with integrated pomodoro timers, ambient sounds, music players, and real-time video/chat capabilities.

## Development Commands

**Run development server:**
```bash
bun dev
```

**Build for production:**
```bash
bun run build
```

**Start production server:**
```bash
bun start
```

**Lint and check code:**
```bash
bun run lint
```

**Format code:**
```bash
bun run format
```

## Tech Stack & Key Dependencies

- **Runtime:** Bun (not Node.js)
- **Framework:** Next.js 16 with App Router
- **Database:** PostgreSQL via Drizzle ORM with `bun-sql` driver
- **Authentication:** better-auth with Drizzle adapter
- **UI Components:** shadcn/ui (New York style) with Radix UI primitives
- **Styling:** Tailwind CSS v4
- **Linting/Formatting:** Biome (replaces ESLint/Prettier)
- **Analytics:** Vercel Analytics

## Architecture

### Database Schema

The application uses a PostgreSQL database with Drizzle ORM. Key tables:

- **users** - User accounts (authenticated via better-auth)
- **rooms** - Virtual focus rooms with name, description, visibility settings
- **roomMembers** - Junction table linking users/guests to rooms with roles (creator/member)
- **roomSettings** - Per-room settings for pomodoro durations, ambient sounds, music URLs

Database schema is defined in `src/lib/schema.ts` with full relational mappings.

### Authentication Architecture

- **Server-side auth:** `src/lib/auth.ts` - better-auth configuration with email/password and Google OAuth
- **Client-side auth:** `src/lib/auth-client.ts` - React hooks for session management
- **Session helpers:** `src/lib/session.ts` - Server-side session utilities
- **API routes:** `/api/auth/[...all]` - Catch-all route handler for better-auth

Both authenticated users and anonymous guests can create/join rooms. Anonymous users provide a guest name stored in `roomMembers.guestName`.

### Application Structure

**Pages:**
- `/` - Home page showing room list for authenticated users, welcome screen for guests
- `/room/[roomId]` - Room workspace with tabbed interface (Focus/Collaborate modes)
- `/auth/signin` - Sign in page
- `/auth/signup` - Sign up page

**API Routes (`src/app/api/`):**
- `GET /api/rooms` - Fetch user's rooms
- `POST /api/rooms` - Create new room
- `GET /api/rooms/[roomId]` - Fetch room details with members and settings
- `POST /api/rooms/join` - Join existing room
- `GET /api/rooms/[roomId]/members` - Fetch room members

**Key Components (`src/components/`):**
- `pomodoro-timer` - Configurable focus/break timer
- `meeting-workspace` - Video/chat collaboration interface
- `sound-selector` - Ambient sound selection
- `music-player` - Integrated music player
- `theme-selector` - Theme customization
- `room-members` - Live member list sidebar
- `room-list` - User's room grid/list view
- `auth-header` - App header with sign in/out controls

### Styling Patterns

- Uses shadcn/ui components with CVA (class-variance-authority)
- Path aliases: `@/` maps to `src/`
- Tailwind config uses CSS variables for theming
- Glassmorphism effects: `backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20`
- Gradient backgrounds: `bg-gradient-to-br from-background via-background to-primary/5`

### Database Connection

The app uses Bun's native SQL driver (`bun-sql`) for PostgreSQL connections. Database URL is expected in `DATABASE_URL` environment variable.

## Important Notes

- This project uses **Bun as the runtime**, not Node.js. All commands should use `bun` instead of `npm/yarn/pnpm`.
- Biome is used for linting/formatting. Run `bun run lint` to check and `bun run format` to fix formatting.
- The React compiler is available but currently commented out in `next.config.ts`.
- All components are client components by default due to the interactive nature of the app.
- Environment variables needed: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (for OAuth).
