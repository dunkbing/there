# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a collaborative focus room application built with Next.js that enables users to create and join virtual workspaces with integrated pomodoro timers, ambient sounds, music players, real-time video/audio communication, screen sharing, collaborative whiteboard, and text chat capabilities.

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

Database schemas are organized in `src/lib/schemas/` with each table in its own file (`users.ts`, `rooms.ts`, `room-members.ts`, `room-settings.ts`) and exported via `index.ts`. Each schema file includes the table definition and its Drizzle relations.

### Authentication Architecture

- **Server-side auth:** `src/lib/auth.ts` - better-auth configuration with email/password and Google OAuth
- **Client-side auth:** `src/lib/auth-client.ts` - React hooks for session management
- **Session helpers:** `src/lib/session.ts` - Server-side session utilities
- **API routes:** `/api/auth/[...all]` - Catch-all route handler for better-auth

Both authenticated users and anonymous guests can create/join rooms. Anonymous users provide a guest name stored in `roomMembers.guestName`.

### Application Structure

**Pages:**
- `/` - Home page showing room list for authenticated users, welcome screen for guests
- `/room/[roomId]` - Room workspace with video collaboration, screen sharing, and whiteboard
- `/auth/signin` - Sign in page
- `/auth/signup` - Sign up page

**API Routes (`src/app/api/`):**
- `GET /api/rooms` - Fetch user's rooms
- `POST /api/rooms` - Create new room
- `GET /api/rooms/[roomId]` - Fetch room details with members and settings
- `POST /api/rooms/join` - Join existing room
- `GET /api/rooms/[roomId]/members` - Fetch room members

**Key Components (`src/components/`):**
- `meeting-workspace` - Main collaboration interface with video grid, screen sharing, and whiteboard
  - Left sidebar: Compact video grid showing all participants
  - Center area: Main content (user avatar, screen share, or whiteboard)
  - Exposes controls via `onControlsReady` callback for toolbar integration
- `pomodoro-timer` - Configurable focus/break timer
- `whiteboard` - Collaborative drawing canvas
- `sound-selector` - Ambient sound selection
- `music-player` - Integrated music player
- `theme-selector` - Theme customization
- `room-members` - Live member list sidebar
- `room-chat` - Real-time text chat
- `room-list` - User's room grid/list view
- `auth-header` - App header with sign in/out controls

**Key Hooks (`src/hooks/`):**
- `useWebRTC` - WebRTC hook for peer-to-peer video, audio, screen sharing, and data channels
  - Manages peer connections and ICE negotiation
  - Separates camera streams (`remoteStreams`) from screen share streams (`remoteScreenStreams`)
  - Handles automatic renegotiation when tracks are added/removed
  - Sends control signals via data channels (track-removed, screen-share-started, screen-share-stopped)
  - Filters muted tracks to avoid showing black video elements

### WebRTC Architecture

The application uses WebRTC for peer-to-peer communication with a signaling server at `ws://localhost:8080/api/signal/ws`.

**Connection Flow:**
1. User joins room → WebSocket connection established with `clientId` and `room` params
2. Send `join` message → Server broadcasts to other peers in room
3. For each peer: Create `RTCPeerConnection` with STUN servers (Google STUN)
4. Offerer creates data channel, generates offer, sends via WebSocket
5. Answerer receives offer, creates answer, sends back
6. ICE candidates exchanged to establish peer-to-peer connection
7. Media tracks flow directly between peers (camera, microphone, screen)

**Track Management:**
- Camera/microphone tracks added to peer connections via `addTrack()`
- Track replacement uses `replaceTrack()` to avoid renegotiation
- Adding new track types (e.g., screen share) requires renegotiation with new offer/answer
- Muted tracks are filtered out on receive to prevent black video display
- Track removal signals sent via data channel for instant UI updates

**Screen Sharing:**
- Separate stream (`screenStream`) from camera stream (`localStream`)
- Uses `getDisplayMedia()` API to capture screen
- Tracks marked with specific signal (`screen-share-started`) via data channel
- Remote screen streams stored separately in `remoteScreenStreams` Map
- Automatically switches main content view when screen sharing starts

**Data Channels:**
- Used for text chat messages
- Control signals: `track-removed`, `screen-share-started`, `screen-share-stopped`
- Created by offerer, received by answerer via `ondatachannel` event
- Reliable ordered delivery for control messages

**Room Layout:**
- **Floating Toolbar** (bottom center): Mic, Camera, Screen Share, Whiteboard controls + Room features
- **Left Sidebar** (320px): Compact participant video grid
- **Main Content** (center, expanded): Dynamic content based on user action
  - Default: Large user avatar with status
  - Screen Share: Full-screen display of shared screen (auto-switches)
  - Whiteboard: Collaborative drawing canvas (manual toggle)
- **Right Sidebar**: Room members list and text chat

### Styling Patterns

- Uses shadcn/ui components with CVA (class-variance-authority)
- Path aliases: `@/` maps to `src/`
- Tailwind config uses CSS variables for theming
- Glassmorphism effects: `backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20`
- Gradient backgrounds: `bg-linear-to-br from-background via-background to-primary/5`

### Database Connection

The app uses Bun's native SQL driver (`bun-sql`) for PostgreSQL connections. Database URL is expected in `DATABASE_URL` environment variable.

## Important Notes

### General
- This project uses **Bun as the runtime**, not Node.js. All commands should use `bun` instead of `npm/yarn/pnpm`.
- Biome is used for linting/formatting. Run `bun run lint` to check and `bun run format` to fix formatting.
- The React compiler is available but currently commented out in `next.config.ts`.
- All components are client components by default due to the interactive nature of the app.
- Environment variables needed: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (for OAuth).

### WebRTC Implementation Details
- **Muted track filtering**: Tracks with `muted: true` and no inbound-rtp data are not added to `remoteStreams` to prevent black video display. They are added only when the `unmute` event fires.
- **Track state monitoring**: Stats polling (every 2s) monitors `framesReceived` to detect dead streams. Only runs for unmuted video tracks.
- **Screen share detection**: Peers sharing screen are tracked in `peersSharingScreenRef` Set. When `screen-share-started` signal received, subsequent tracks from that peer route to `remoteScreenStreams` instead of `remoteStreams`.
- **Control exposure**: `meeting-workspace` component exposes control functions (toggleMic, toggleVideo, etc.) to parent via `onControlsReady` callback, allowing the floating toolbar in room page to control media devices.
- **Browser compatibility**: Screen sharing uses `getDisplayMedia()` which requires HTTPS in production (works on localhost without HTTPS).
