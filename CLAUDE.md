# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

react-native-fs is a native filesystem access module for React Native with added Electron support (on the `electron` branch). It provides file operations (read, write, copy, move, delete) and file transfers (download, upload) across iOS, Android, Windows, and Electron.

The main branch is `axsy-fork-master`. The `electron` branch adds desktop support via Electron IPC.

## Common Commands

```bash
yarn check          # Run lint + typecheck + format (all checks)
yarn lint           # ESLint only
yarn typecheck      # TypeScript compilation check only
yarn format         # Prettier format check only
yarn build          # Build with react-native-builder-bob (output to lib/)
yarn clean          # Delete build artifacts
```

No tests are currently configured despite Jest being in devDependencies.

## Architecture

### Platform Abstraction

The main API in `src/index.ts` uses `Platform.OS` and `Platform.select()` from React Native to choose between native modules (iOS/Android) and the Electron renderer implementation:

- **Native (iOS/Android/Windows):** Delegates to `NativeModules.RNFSManager`
- **Electron (`Platform.OS === "web"`):** Delegates to `src/electron/renderer.ts`

### Electron IPC Architecture

Electron support uses a three-layer IPC pattern with `axsy:fs:` channel prefixes:

1. **Main process** (`src/electron/main.ts`) — Implements filesystem operations using Node.js `fs/promises`, registers `ipcMain.handle()` handlers. Entry: `filesystem.main.init()`
2. **Preload** (`src/electron/preload.ts`) — Context bridge exposes `window.fsapi` and `window.fspaths` globals. Paths are fetched synchronously at preload time.
3. **Renderer** (`src/electron/renderer.ts`) — `RNFSManager` class delegates all methods to `window.fsapi`/`window.fspaths`

### Module Exports

The package exports three entry points:
- Default: Main RNFS API (`src/index.ts`)
- `react-native-fs/preload`: Electron preload script
- `react-native-fs/main`: Electron main process setup

### Encoding

All file I/O uses base64 encoding internally between JS and native layers. The API boundary handles utf8/ascii/base64 conversion. `src/utf8.ts` is a vendored third-party encoder (`@ts-nocheck`).

### Job ID System

Downloads and uploads use incrementing job IDs for event subscription management. Events are named `DownloadBegin-${jobId}`, `DownloadProgress-${jobId}`, etc. Native platforms use `NativeAppEventEmitter`; Electron uses window globals.

## Code Style

- Prettier: double quotes, semicolons, no trailing commas, 2-space indent, LF line endings
- ESLint: `@react-native` config + prettier plugin
- TypeScript: strict mode, ESNext target, verbatimModuleSyntax
- ES modules (`"type": "module"` in package.json)

## Build System

Uses `react-native-builder-bob` targeting ESM output and TypeScript declarations. Build config is in `package.json` under `react-native-builder-bob` key.

## Package Manager

Yarn v4 (Berry). The `.npmrc` configures GitHub Packages registry for `@axsy-dev` scoped packages.
