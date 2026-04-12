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

## Notes

- No implementation exists yet — this is a greenfield project.
- CLI binary name: `enote`. npm package name: `enote-cli`.
- Tech stack chosen: TypeScript (Node.js 18+), commander, native fetch, tsup for bundling.
- Config file: `~/.enote/config.json` (JSON). API key env var: `ENOTE_API_KEY`.

## Development Commands

```bash
npm run build   # compile src/ → dist/index.js (single CJS bundle with shebang)
npm run dev     # watch mode
node dist/index.js --help   # run locally without installing
npm link        # install globally as `enote` for local testing
```

## Code Structure

- `src/config.ts` — config read/write (`~/.enote/config.json`), API key resolution, `printSuccess`/`printError` output helpers
- `src/client.ts` — fetch wrapper for all HTTP verbs; always outputs JSON to stdout/stderr and calls `process.exit(1)` on failure
- `src/commands/init.ts` — two-phase init: first call returns device list, second call (with `--select`) writes config
- `src/commands/devices.ts` — `devices list`
- `src/commands/todos.ts` — full CRUD for todos
- `src/commands/display.ts` — text / structured / image / delete push commands
- `skills/` — agent-agnostic Markdown skill docs; symlinked into `.claude/skills/`
