# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TripPlanner is an AI-powered trip planning and itinerary management system built as a **PNPM monorepo** with Lerna. It features multi-agent orchestration via LangGraph, multi-conversation thread management, and a modern UI with IBM Carbon Design System.

## Essential Commands

### Development

```bash
# Install dependencies (required after clone)
pnpm install

# Build all packages (required before first run)
pnpm build

# Start both API and UI concurrently
pnpm dev:all

# Start individual services
pnpm dev:api          # API server at http://localhost:3011
pnpm dev              # Browser UI at http://localhost:3010

# Type checking
pnpm type-check       # Check all packages
```

### Working with Individual Packages

```bash
# Run commands in specific packages
pnpm --filter @tripplanner/agent-graph build
pnpm --filter @tripplanner/api dev

# Available package names:
# @tripplanner/agent-graph
# @tripplanner/api
# @tripplanner/browser-app
```

### Testing & Quality

```bash
# No test suite currently exists - tests should be added using vitest
# vitest is configured in the root devDependencies

pnpm lint             # Lint all packages
pnpm format           # Format with Prettier
```

### Storybook

```bash
pnpm storybook:build  # Build Storybook (also runs in CI as a merge gate)
```

Storybook `~8.4.0` is configured with `.storybook/main.ts` + `preview.ts`. Stories cover itinerary panel components (`DayWeekPanel`, `ItinerariesOverviewTile`, and panel variants). The CI pipeline enforces a Storybook build gate on every push and PR — a broken story blocks merge.

### Security

```bash
pnpm security:check   # Run comprehensive security scan
pnpm security:verify  # Verify security configuration
pnpm security:scan    # Scan staged files (runs in pre-commit hook)
```

### Maintenance

```bash
pnpm clean            # Clean all build outputs and node_modules
```

## Configuration

### API Keys and Environment

Configuration is loaded via environment variables or configuration files:

1. **`.env.local`** (gitignored)
2. **`packages/agent-graph/env.json`** (gitignored, if implemented)
3. **Environment variables** (fallback)

To set up:

```bash
# Create .env.local file in root
cp .env.example .env.local

# Edit with your API keys
# Required: ANTHROPIC_API_KEY
```

**CRITICAL**: `env.json`, `.env`, and `.env.local` are gitignored. Pre-commit hooks actively scan for API key leaks. Never commit these files or hardcode API keys.

## Architecture

### Package Responsibilities

**@tripplanner/agent-graph**
- LangGraph multi-agent orchestration
- Agent nodes for trip planning, itinerary generation, recommendations
- Depends on: Anthropic SDK, LangChain, LangGraph
- Uses Zod for data validation

**@tripplanner/api**
- Express.js REST API backend (port 3011)
- Routes for chat, threads, trips, itineraries
- Middleware: CORS, Helmet, rate limiting
- SQLite database for conversation persistence
- Depends on agent-graph package

**@tripplanner/browser-app**
- React 18 + TypeScript + Vite
- IBM Carbon Design System (v1.67) for UI
- Redux Toolkit for state management
- Components: InteractiveChat, CondensedChat, Dashboard, ThreadSidebarConnected
- Shared UI from `@ojfbot/frame-ui-components`: DashboardLayout, ChatShell, ChatMessage, ThreadSidebar, MarkdownMessage, BadgeButton, ErrorBoundary (ADR-0030)
- Communicates with API via axios
- Port 3010 by default

### Build Dependencies

Packages must be built in dependency order. The root `pnpm build` handles this automatically:
1. agent-graph (no dependencies)
2. api (depends on agent-graph)
3. browser-app (no dependencies, standalone frontend)

### TypeScript Configuration

- Base config: `tsconfig.base.json` (strict mode, ES2022 target, ESNext modules)
- Each package extends the base config
- All packages use ES modules (`"type": "module"`)
- Module resolution: `"bundler"`

### Workspace Catalog

Dependencies are managed via PNPM workspace catalog in `pnpm-workspace.yaml`. When adding dependencies, check if they exist in the catalog first.

## Key Features

### Multi-Conversation Thread Management

TripPlanner supports multiple concurrent conversation threads:
- Each user can have multiple active trip planning conversations
- Threads are persisted in SQLite database
- ThreadSidebarConnected wraps shared ThreadSidebar from `@ojfbot/frame-ui-components`
- Thread state managed via Redux (`threadsSlice`)

### Dual Chat Interfaces

1. **InteractiveChat** - Full-screen chat on the Interactive tab
   - Main interface for detailed conversations
   - Markdown rendering with syntax highlighting
   - Message history and scrolling

2. **CondensedChat** - Persistent floating chat
   - Appears on non-Interactive tabs
   - Collapsible interface (bottom-right corner)
   - Unread message counter
   - Quick access without switching tabs

### App Switcher

Header contains a hamburger menu (left side) that opens an application switcher sidebar:
- Search functionality for finding apps
- Configured port mappings:
  - TripPlanner: 3010
  - BlogEngine: 3005
  - CV Builder: 3000
- Navigates between sibling applications

## Application Structure

### Browser App Components

**Layout Components**:
- `App.tsx` - Root component with header, app switcher, theme toggle
- `Dashboard.tsx` - Main layout with tabs and thread sidebar toggle
- `ThreadSidebarConnected.tsx` - Redux wrapper for shared ThreadSidebar (`@ojfbot/frame-ui-components`)

**Chat Components**:
- `InteractiveChat.tsx` - Full chat interface on Interactive tab
- `CondensedChat.tsx` - Floating persistent chat on other tabs
- `MarkdownMessage` - Imported from `@ojfbot/frame-ui-components` (markdown rendering with action links + badge suggestions)

**Tab Content Components**:
- `TripsLibrary.tsx` - My Trips tab (placeholder)
- `ItinerariesLibrary.tsx` - Itineraries tab (placeholder)
- `SettingsDashboard.tsx` - Settings tab (placeholder)

### State Management (Redux)

**Slices**:
- `navigationSlice` - Tab navigation state
- `chatSlice` - Chat messages, drafts, loading state, unread counts
- `threadsSlice` - Thread management with async thunks for API calls

**Hooks**:
- `useAppDispatch()` - Typed dispatch hook
- `useAppSelector()` - Typed selector hook

## API Endpoints

### Chat
- `POST /api/v1/chat/message` - Send message (streaming support coming soon)

### Threads
- `GET /api/v1/threads?userId={id}` - List user's threads
- `POST /api/v1/threads` - Create new thread
- `GET /api/v1/threads/{id}` - Get thread details
- `DELETE /api/v1/threads/{id}` - Delete thread

### Health
- `GET /health` - API health check

## Security Considerations

**Pre-commit Hook**: `.husky/pre-commit` runs `scripts/security-scan.sh` which:
- Scans staged TypeScript/JavaScript/JSON files for API key patterns
- Blocks commits containing: `sk-ant-*`, `sk-*`, `secret_*`, `ghp_*`
- Prevents accidental commits of `env.json`, `.env`, `.env.local`

**API Key Isolation**: Browser app never receives API keys. All AI and integration calls go through the backend API.

**Rate Limiting**: API uses express-rate-limit to prevent abuse (100 requests per 15 minutes per IP).

## Code Style & Patterns

### Import Paths
All imports use `.js` extensions even for TypeScript files (ES module requirement):
```typescript
export * from './models/index.js';
import { logger } from './utils/logger.js';
```

### Workspace Dependencies
Internal packages reference each other via `workspace:*`:
```json
{
  "dependencies": {
    "@tripplanner/agent-graph": "workspace:*"
  }
}
```

### Carbon Design System
UI uses IBM Carbon components. Import from `@carbon/react`:
```typescript
import { Button, Theme, Grid, Tabs, Tab } from '@carbon/react';
```

### Redux Patterns
- Use typed hooks from `src/store/hooks.ts`
- Prefer `useAppSelector` and `useAppDispatch`
- Async operations use `createAsyncThunk`

## Development Workflow

1. Clone and install: `pnpm install`
2. Configure API keys: Create `.env.local` with `ANTHROPIC_API_KEY`
3. Build: `pnpm build`
4. Run: `pnpm dev:all`
5. Type check before committing: `pnpm type-check`
6. Security scan runs automatically on commit

## Common Issues

**Build failures**: Ensure packages are built in order. Run `pnpm build` from root, not individual packages.

**Port conflicts**: Browser app runs on 3010, API on 3011. Adjust in `vite.config.ts` and `packages/api/src/index.ts` if needed.

**Module resolution errors**: All imports must use `.js` extensions in TypeScript. Vite/tsc will handle the transformation.

**Pre-commit hook failures**: If blocked by security scan, check for API keys in staged files. Remove and re-stage.

## Ports Configuration

- **Browser App**: http://localhost:3010
- **API Server**: http://localhost:3011

## Related Projects

This project follows the architecture pattern established in:
- **BlogEngine** (port 3005) - AI-powered blog and content generation
- **CV Builder** (port 3000) - AI-powered resume builder

All three projects share similar patterns:
- PNPM monorepos with Lerna
- agent-graph + api + browser-app structure
- Carbon Design System UI
- Multi-conversation threading
- App switcher in header

---

## Frame OS Integration

TripPlanner is a **Module Federation remote** in the Frame OS cluster (see `domain-knowledge/frame-os-context.md`).

### MF remote surface area
`packages/browser-app/vite.config.ts` exposes two components:
- `./Dashboard` — loaded by the shell as the main content view
- `./Settings` — bare settings panel loaded inside the shell's `SettingsModal`

### Shared singletons (must match shell exactly)
```typescript
shared: {
  react:              { singleton: true, requiredVersion: '^18.3.1' },
  'react-dom':        { singleton: true, requiredVersion: '^18.3.1' },
  '@reduxjs/toolkit': { singleton: true, requiredVersion: '^2.5.0' },
  'react-redux':      { singleton: true, requiredVersion: '^9.2.0' },
  '@carbon/react':    { singleton: true, requiredVersion: '^1.67.0' },
} as any   // 'as any' required — singleton/requiredVersion typed as commented-out in plugin types
```

### Local MF dev
`@originjs/vite-plugin-federation` only generates `remoteEntry.js` on `vite build`, NOT `vite dev`.
For MF local dev: `pnpm --filter @tripplanner/browser-app build && pnpm --filter @tripplanner/browser-app preview`

### Shell Redux singleton
The shell's Redux store is shared via MF. Settings panels use `useAppSelector` and `useAppDispatch` from the shell's store singleton — no local store needed for settings state.

### Production deployment
trips.jim.software (Vercel) — auto-deploys on push to main.
Branch protection: PR required, rebase-only merge (GitHub Ruleset).
