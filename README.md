# TripPlanner

> AI-powered trip planning and itinerary management system

TripPlanner is an intelligent travel planning platform that helps users organize trips, create detailed itineraries, and get AI-powered recommendations for destinations, activities, and travel logistics.

## Features

- **Multi-Conversation Threading**: Work on multiple trip plans simultaneously with independent conversation threads
- **AI-Powered Planning**: Built-in AI assistant for trip recommendations, itinerary generation, and travel advice
- **Dual Chat Interface**:
  - Full interactive chat on dedicated tab
  - Persistent condensed chat that follows you across tabs
- **Thread Management**: Right-side sidebar for managing multiple conversation threads
- **App Switcher**: Navigate between sibling applications (TripPlanner, BlogEngine, Resume Builder, Lean Canvas)
- **Carbon Design System**: Modern, accessible UI built with IBM Carbon Design System
- **Dark/Light Theme**: Toggle between themes via header button

## Architecture

TripPlanner is built as a monorepo using pnpm workspaces and Lerna:

```
tripplanner/
├── packages/
│   ├── agent-graph/         # LangGraph multi-agent system
│   ├── api/                 # Express.js REST API
│   └── browser-app/         # React + Vite frontend
├── scripts/                 # Build and utility scripts
├── package.json             # Root package configuration
├── pnpm-workspace.yaml      # Workspace definition
└── lerna.json               # Monorepo configuration
```

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Carbon Design System (@carbon/react v1.67)
- **Shared Components**: `@ojfbot/frame-ui-components`
- **State Management**: Redux Toolkit
- **Backend**: Express.js + Node.js
- **AI/LLM**: Anthropic Claude via LangGraph
- **Database**: SQLite (better-sqlite3)
- **Build Tool**: Vite 5
- **Package Manager**: pnpm 9.15+
- **Monorepo**: Lerna + pnpm workspaces
- **Styling**: Sass (SCSS)
- **Component Development**: Storybook ~8.4.0

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd TripPlanner

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# Build all packages
pnpm build
```

### Running the Application

```bash
# Start both API and browser app
pnpm dev:all

# OR start them separately in different terminals:

# Terminal 1: API server (port 3011)
pnpm dev:api

# Terminal 2: Browser app (port 3010)
pnpm dev
```

The application will be available at:
- Browser App: http://localhost:3010
- API Server: http://localhost:3011

### Development

```bash
# Type check all packages
pnpm type-check

# Build all packages
pnpm build

# Build Storybook (also runs in CI as a merge gate)
pnpm storybook:build

# Run security verification
pnpm security:verify

# Clean build artifacts
pnpm clean
```

## Project Structure

### Packages

**agent-graph** (`packages/agent-graph`)
- LangGraph-based multi-agent system
- Trip planning orchestration
- AI agent implementations

**api** (`packages/api`)
- Express.js REST API server
- Thread management endpoints
- Chat message handling
- SQLite database integration

**browser-app** (`packages/browser-app`)
- React frontend application
- Components:
  - `InteractiveChat` - Main chat interface
  - `CondensedChat` - from `@ojfbot/frame-ui-components`
  - `ThreadSidebar` - from `@ojfbot/frame-ui-components`
  - `MarkdownMessage` - from `@ojfbot/frame-ui-components`
  - `ErrorBoundary` - from `@ojfbot/frame-ui-components`
  - `Dashboard` - Tab-based layout
- Redux state management
- Carbon Design System UI via `@ojfbot/frame-ui-components`

### State Management

**Redux Slices**:
- `navigationSlice` - Tab navigation
- `chatSlice` - Messages, drafts, unread counts
- `threadsSlice` - Thread management with async operations

## Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```env
ANTHROPIC_API_KEY=your_api_key_here
```

### Ports

- Browser App: 3010 (configurable in `packages/browser-app/vite.config.ts`)
- API Server: 3011 (configurable in `packages/api/src/index.ts`)

### App Switcher

The header contains an app switcher for navigating between related applications:
- **TripPlanner**: http://localhost:3010 (this app)
- **BlogEngine**: http://localhost:3005
- **Resume Builder**: http://localhost:3000
- **Lean Canvas**: (see App Switcher for port)

Edit the port mappings in `packages/browser-app/src/App.tsx` if needed.

## Security

- **Pre-commit Hooks**: Automated checks for API keys and build artifacts
- **CI Secret Scanning**: TruffleHog secret detection runs in CI on every push and pull request
- **Gitignore**: Comprehensive ignore patterns for sensitive data
- **Security Scripts**: Run `pnpm security:verify` to check for security issues

**Important**: Never commit:
- `env.json` or `.env` files
- Build artifacts (`dist/`, `build/`)
- API keys or secrets
- Personal data directories

## Scripts

### Root Scripts

- `pnpm dev:all` - Start both API and browser app
- `pnpm dev` - Start browser app only
- `pnpm dev:api` - Start API server only
- `pnpm build` - Build all packages
- `pnpm type-check` - Run TypeScript type checking
- `pnpm storybook:build` - Build Storybook (CI merge gate)
- `pnpm security:verify` - Run security audit
- `pnpm clean` - Clean all build outputs

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run `pnpm type-check` to ensure no type errors
4. Run `pnpm storybook:build` to ensure Storybook builds cleanly (CI will block merge if this fails)
5. Run `pnpm security:verify` to check security
6. Commit with clear, descriptive messages
7. Pre-commit hooks will automatically scan for secrets
8. Push and create a pull request

### Commit Conventions

We use conventional commits for clear history:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test additions or changes
- `chore:` - Build process or auxiliary tool changes

## Roadmap

- [ ] Complete agent-graph implementation with LangGraph
- [ ] Implement thread persistence with SQLite
- [ ] Add trip and itinerary management
- [ ] Integrate external APIs (maps, weather, bookings)
- [ ] Add export capabilities (PDF itineraries)
- [ ] Multi-user support and authentication
- [ ] Real-time collaboration features

## License

MIT

## Related Projects

TripPlanner is part of a nine-repo fleet federated into `@ojfbot/shell` at `frame.jim.software`:

- [BlogEngine](../blogengine) - AI-powered blog and documentation generation
- [Resume Builder](../cv-builder) - AI-powered resume builder
- [Lean Canvas](../lean-canvas) - Lean canvas planning tool
- [purefoy](../purefoy) - Podcast/episodes dashboard
- [core-reader](../core-reader) - Reader application
- [@ojfbot/frame-ui-components](../frame-ui-components) - Shared UI component library

---

Built with ❤️ using React, TypeScript, LangGraph, and Carbon Design System
