# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. It uses Claude AI to generate React components through a chat interface, displays them in real-time using a virtual file system, and allows users to iterate on their designs.

## Development Commands

### Setup
```bash
npm run setup
```
Installs dependencies, generates Prisma client, and runs database migrations.

### Development
```bash
npm run dev
```
Starts the Next.js development server with Turbopack on http://localhost:3000.

### Testing
```bash
npm test
```
Runs Vitest tests in watch mode.

### Database
```bash
npm run db:reset
```
Resets the SQLite database and re-runs all migrations.

### Build
```bash
npm run build
```
Creates a production build.

## Architecture

### Virtual File System (VFS)

The core of UIGen is a virtual file system (`src/lib/file-system.ts`) that operates entirely in memory:

- **VirtualFileSystem class**: Maintains a Map-based file tree with CRUD operations for files and directories
- **No disk writes**: All files exist only in memory during the preview session
- **Serialization**: The VFS state is serialized and persisted to the database for registered users via the `Project` model
- **AI Tool Integration**: The VFS is passed to AI tools (`str_replace_editor`, `file_manager`) allowing Claude to manipulate files

Key methods:
- `createFile()`, `updateFile()`, `deleteFile()`: Basic file operations
- `serialize()`/`deserialize()`: Convert VFS to/from JSON for database storage
- `viewFile()`, `replaceInFile()`, `insertInFile()`: Editor-style operations used by AI tools

### AI Component Generation Flow

1. **Chat API** (`src/app/api/chat/route.ts`):
   - Receives messages and current VFS state from the client
   - Injects system prompt from `src/lib/prompts/generation.tsx`
   - Uses Vercel AI SDK's `streamText()` with Claude (or MockLanguageModel if no API key)
   - Provides two AI tools to manipulate the VFS:
     - `str_replace_editor`: Create, view, and edit files (string replacement)
     - `file_manager`: Rename and delete files/directories
   - Saves conversation and VFS state to database on completion

2. **AI Tools** (`src/lib/tools/`):
   - Tools are bound to a specific VFS instance
   - Tool calls from Claude directly modify the VFS
   - Results are streamed back to the client

3. **Mock Provider** (`src/lib/provider.ts`):
   - If `ANTHROPIC_API_KEY` is not set, uses `MockLanguageModel`
   - Generates static example components (Counter, ContactForm, Card)
   - Simulates multi-step tool calling to demonstrate the system

### Client-Side Architecture

**React Context Pattern:**

1. **FileSystemContext** (`src/lib/contexts/file-system-context.tsx`):
   - Wraps VFS with React state management
   - Provides `handleToolCall()` to apply AI tool calls on the client
   - Triggers re-renders via `refreshTrigger` when files change
   - Manages selected file state for the code editor

2. **ChatContext** (`src/lib/contexts/chat-context.tsx`):
   - Manages chat messages and streaming state
   - Calls the `/api/chat` endpoint
   - Invokes `handleToolCall()` on FileSystemContext when AI uses tools

**Component Structure:**

- **ChatInterface**: Message list + input, handles AI streaming responses
- **CodeEditor**: Monaco editor for viewing/editing files in the VFS
- **FileTree**: Hierarchical display of VFS contents
- **PreviewFrame**: Renders React components in an isolated iframe

### Live Preview System

The preview system (`src/components/preview/PreviewFrame.tsx` + `src/lib/transform/jsx-transformer.ts`) transforms VFS files into a runnable React app:

1. **JSX Transformation**:
   - Uses `@babel/standalone` to transform JSX/TSX files to JavaScript
   - Removes CSS imports (CSS is collected separately)
   - Detects missing dependencies

2. **Import Map Generation**:
   - Creates ES Module import map for the iframe
   - Maps local files to blob URLs
   - Maps React/ReactDOM to ESM CDN (esm.sh)
   - Handles `@/` alias (maps to VFS root)
   - Creates placeholders for missing imports to prevent runtime errors

3. **Preview HTML**:
   - Injects Tailwind CSS CDN
   - Embeds import map as `<script type="importmap">`
   - Renders entry point (usually `/App.jsx`) using React 19
   - Includes error boundary for runtime errors
   - Displays syntax errors inline if Babel transformation fails

4. **Sandboxed Execution**:
   - Uses iframe with `sandbox="allow-scripts allow-same-origin allow-forms"`
   - Blob URLs prevent CSP issues
   - Isolated from parent window

### Database Schema

Uses Prisma with SQLite (`prisma/schema.prisma`):

- **User**: Authentication (email/password with bcrypt)
- **Project**: Stores name, messages (JSON), and VFS data (JSON) per user
  - `messages`: Serialized AI SDK conversation history
  - `data`: Serialized VFS state (output of `fileSystem.serialize()`)

Prisma client is generated to `src/generated/prisma/` (non-standard location).

### Authentication

JWT-based authentication (`src/lib/auth.ts`):

- **Session management**: `createSession()`, `getSession()`, `deleteSession()`
- Sessions stored in HTTP-only cookies (`auth-token`)
- 7-day expiration
- Middleware (`src/middleware.ts`) protects project routes
- Anonymous users can use the app but can't save projects

### Key Files

- `src/app/api/chat/route.ts`: AI streaming endpoint
- `src/lib/file-system.ts`: Virtual file system implementation
- `src/lib/transform/jsx-transformer.ts`: Babel transformation and import map generation
- `src/components/preview/PreviewFrame.tsx`: Live preview renderer
- `src/lib/contexts/file-system-context.tsx`: VFS React integration
- `src/lib/tools/`: AI tool definitions

## Important Patterns

### Entry Point Convention

The preview system looks for these entry points in order:
1. `/App.jsx` or `/App.tsx`
2. `/index.jsx` or `/index.tsx`
3. `/src/App.jsx` or `/src/App.tsx`
4. First `.jsx`/`.tsx` file found

The entry point must have a default export of a React component.

### Import Alias

All local imports should use the `@/` alias which maps to the VFS root:
```jsx
import Counter from '@/components/Counter';
```

### Tool Call Synchronization

AI tool calls are applied in two places:
1. Server-side: VFS is modified during AI stream generation
2. Client-side: `handleToolCall()` applies the same changes to the client VFS for immediate UI updates

Both must stay in sync, which is why `handleToolCall()` mirrors the tool execution logic.

### Code Style

Use comments sparingly. Only comment complex code.

## Testing

- Uses Vitest with jsdom environment
- Test files: `**/__tests__/*.test.ts(x)`
- Tests cover contexts, VFS operations, and JSX transformation
- Run with `npm test`

## Environment Variables

- `ANTHROPIC_API_KEY`: Optional. If not set, uses mock provider with static examples.
- `JWT_SECRET`: Used for session signing. Defaults to `"development-secret-key"`.
