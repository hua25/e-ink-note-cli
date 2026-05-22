# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A CLI tool (`enote`) for interacting with the Zectrix cloud platform — an e-ink display device management system. The API is documented in `docs/zectrix-api.md`.

**Base URL:** `https://cloud.zectrix.com/open/v1`  
**Auth:** `X-API-Key` header

## API Surface (from docs/zectrix-api.md)

Three functional areas:

**Devices**
- `GET /devices` — list devices (returns `deviceId` as MAC address, `alias`, `board`)

**Todos**
- `GET /todos` — list todos (filter by `status` 0/1 or `deviceId`)
- `POST /todos` — create todo (`title` required; optional: `description`, `dueDate` yyyy-MM-dd, `dueTime` HH:mm, `repeatType` daily/weekly/monthly/yearly/none, `repeatWeekday` 0–6, `repeatMonth` 1–12, `repeatDay` 1–31, `priority` 0/1/2, `deviceId`)
- `PUT /todos/:id` — update todo (`title`, `description`, `dueDate`, `dueTime`, `priority`)
- `PUT /todos/:id/complete` — toggle complete
- `DELETE /todos/:id` — delete todo

**Display push** (to e-ink device pages 1–5)
- `POST /devices/:deviceId/display/image` — multipart `images` field, up to 5 files, 2MB each; optional `dither` (bool, default true), `pageId`
- `POST /devices/:deviceId/display/text` — body: `text` (required, ≤5000 chars), optional `fontSize` (12–48, default 20), `pageId`
- `POST /devices/:deviceId/display/structured-text` — body: `title` (≤200 chars) and/or `body` (≤5000 chars), optional `pageId`; at least one of title/body required
- `DELETE /devices/:deviceId/display/pages/:id` — omit `:id` to delete all pages

All responses use `{ "code": 0, "data": ... }` on success.

## Architecture

**Error handling:** Library-layer code (`src/client.ts`, `src/config.ts`) throws typed errors (`ApiError`, `ConfigError`) instead of calling `process.exit`. Only the top-level CLI handler in `src/index.ts` and command-layer validation call `process.exit`. This makes the library testable and reusable.

**Output:** Default output is human-readable (tables for lists, key-value for objects). A global `--json` flag switches to raw JSON for programmatic consumers (scripts, AI agents).

## Development Commands

```bash
npm run build      # compile src/ → dist/index.js (single CJS bundle with shebang)
npm run dev        # watch mode
npm test           # run tests (vitest)
npm test:watch     # interactive test watch
node dist/index.js --help   # run locally without installing
npm link           # install globally as `enote` for local testing
```

## Code Structure

- `src/errors.ts` — typed error classes (`ApiError`, `ConfigError`) thrown by library layer and caught by CLI entry point
- `src/types.ts` — typed request body interfaces (CreateTodoRequest, UpdateTodoRequest, TextDisplayRequest, StructuredTextRequest)
- `src/config.ts` — config read/write (`~/.enote/config.json` with 0o600 permissions), API key resolution, device resolution
- `src/client.ts` — fetch wrapper for all HTTP verbs; throws `ApiError` on failure; 30s request timeout via AbortController
- `src/output.ts` — dual-mode output: human-readable tables/key-value by default, raw JSON with `--json` flag
- `src/utils.ts` — shared utilities (`fanOut` with `Promise.allSettled` for partial-failure handling across multiple devices)
- `src/index.ts` — CLI entry point: global `--json` / `--api-key` options, top-level error handler, version from package.json
- `src/commands/init.ts` — two-phase init: first call returns device list, second call (with `--select`) writes config
- `src/commands/devices.ts` — `devices list`
- `src/commands/todos.ts` — full CRUD for todos; `--device` is repeatable on `create`; client-side enum validation for repeatType/priority
- `src/commands/display.ts` — text / structured / image / delete push commands; `--device` is repeatable; `--no-dither` boolean flag; files read once and cached across multi-device fan-out
- `tests/` — vitest unit tests for config, client, utils
- `skills/` — agent-agnostic Markdown skill docs; symlinked into `.claude/skills/`
