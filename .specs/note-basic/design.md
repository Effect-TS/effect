# Design: note

This document describes the architecture and implementation strategy for the `note` CLI tool.

## Module Architecture

```
packages-native/note/
├── src/
│   ├── index.ts        # Library exports (Note, Slug, Validate)
│   ├── bin.ts          # CLI implementation (command + run)
│   ├── Note.ts         # Core note creation logic
│   ├── Slug.ts         # Slug generation utility
│   └── Validate.ts     # Argument validation (filename, flag, existing file detection)
├── scripts/
│   └── copy-bin.mjs    # Copies compiled bin to dist/
├── test/
│   ├── Slug.test.ts    # Slug unit tests
│   ├── Validate.test.ts # Validation unit tests
│   └── Note.test.ts    # Note function tests
├── bin.mjs             # Smart loader: dist/bin.mjs → build/esm/bin.js fallback
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── tsconfig.src.json
├── tsconfig.test.json
└── vitest.config.ts
```

## Data Models

### NoteOptions
- `title`: string — the original title text with spaces preserved

### NoteResult
- `filename`: string — generated filename (e.g., `note-2025-11-26-my-title.md`)
- `content`: string — the markdown content written to file

### ValidationError
- Tagged error type for argument validation failures
- Fields: `type` (filename | flag | existing-file), `arg` (the problematic argument), `message` (user-facing explanation)

## API Signatures

| Module | Function | Inputs | Output | Description |
|--------|----------|--------|--------|-------------|
| Slug | `slugify` | title: string | string | Converts title to URL-safe slug |
| Note | `makeFilename` | title: string, date: Date | string | Generates `note-YYYY-MM-DD-slug.md` filename |
| Note | `makeContent` | title: string, timestamp: Date | string | Generates markdown content |
| Note | `createNote` | options: NoteOptions | Effect\<NoteResult, PlatformError, FileSystem \| Path\> | Creates note file in cwd |
| Validate | `looksLikeFilename` | arg: string | boolean | True if arg has dot and no spaces |
| Validate | `looksLikeFlag` | arg: string | boolean | True if arg starts with `-`/`--` or contains `=` |
| Validate | `TitleWord` | — | Schema\<string, string\> | Schema that validates a string is a plain title word |

## Slug Algorithm

1. Convert input to lowercase
2. Replace all whitespace sequences with a single hyphen
3. Remove all characters that are not alphanumeric or hyphens
4. Collapse consecutive hyphens into one
5. Trim leading and trailing hyphens

## CLI Structure

- Use `@effect/cli` Command and Args modules with Effect Schema for validation
- Define a `TitleWord` schema that validates each argument is plain text (not a flag/filename)
- Use `Args.text` with schema refinement to reject invalid args at parse time
- Schema checks: not starting with `-`, not containing `=`, not looking like a filename
- Use `Args.repeated` and `Args.atLeast(1)` for variadic title words
- Existing file check happens in the command handler (requires FileSystem)
- Join validated args with spaces to form title string
- Provide `NodeContext.layer` for platform services
- Run via `NodeRuntime.runMain`

## Binary Entry Strategy

- Single `bin.mjs` loader at package root serves both dev and dist scenarios
- Loader checks for `dist/bin.mjs` first (published), falls back to `build/esm/bin.js` (development)
- `scripts/copy-bin.mjs` copies `build/esm/bin.js` to `dist/bin.mjs` with execute permission during build
- `package.json` bin field points to `./bin.mjs`

## Package Configuration

- Name: `note` (unscoped, top-level)
- Type: ESM (`"type": "module"`)
- Bin field maps `note` command to `./bin.mjs`
- PublishConfig sets directory to `dist` for npm publishing
- Dependencies: `@effect/cli`, `@effect/platform-node`, `effect`
- Dev: `@effect/vitest`
- Files: build, dist, src, bin.mjs, scripts, README.md, LICENSE, CHANGELOG.md

## Error Handling Strategy

| Error Scenario | Handling Approach |
|----------------|-------------------|
| No title provided | `@effect/cli` handles via `Args.atLeast(1)` — automatic error message |
| Argument looks like filename | Check if arg contains dot and no spaces; abort with helpful message |
| Argument matches existing file | Check filesystem before proceeding; abort with confusion warning |
| Argument looks like flag/option | Check if arg starts with `-`/`--` or contains `=`; abort and show help |
| File write failure | `FileSystem.writeFileString` returns `PlatformError` — surfaced by `NodeRuntime.runMain` |
| Invalid slug (empty after processing) | Slug function returns empty string; caller should validate |

## Test Strategy

### Unit Tests (Slug.test.ts)
- Lowercase conversion
- Space to hyphen replacement
- Special character removal
- Multiple hyphen collapse
- Leading/trailing hyphen trim
- Empty input handling
- Mixed case with special characters

### Validation Tests (Validate.test.ts)
- `looksLikeFilename`: true for "foo.md", "test.txt", false for "foo bar.md", "hello"
- `looksLikeFlag`: true for "--help", "-v", "--key=val", false for "hello", "my-title"
- `validateArgs`: fails when arg matches existing file in cwd

### Function Tests (Note.test.ts)
- `makeFilename` produces correct format given fixed date
- `makeContent` produces correct markdown structure
- Both functions handle edge cases (very long titles, unicode)

### Integration Verification
- Manual verification: run `npx note test title` and inspect output file
- Build verification: `pnpm build`, `pnpm check`, `pnpm lint` pass
