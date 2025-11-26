# Plan: note

This document provides a step-by-step execution checklist for implementing the `note` CLI package using **Red-Green-Refactor TDD** (write failing test first, then implement to make it pass).

## Phase A: Package Scaffold

### A1. Create package directory structure
- Create `packages-native/note/` with `src/`, `test/`, `scripts/` subdirectories
- **Verify:** Directory exists with correct structure

### A2. Create package.json
- Define name as `note` (unscoped)
- Set type to `module`
- Configure bin, exports, scripts, dependencies per design
- **Verify:** `cat package.json` shows correct structure

### A3. Create tsconfig files
- Copy pattern from existing packages-native package (e.g., libsqlite)
- Create tsconfig.json, tsconfig.build.json, tsconfig.src.json, tsconfig.test.json
- **Verify:** `pnpm check` runs without config errors

### A4. Create vitest.config.ts
- Copy pattern from existing package
- **Verify:** `pnpm test` runs (may have no tests yet)

### A5. Create bin.mjs loader
- Implement smart loader that checks dist/bin.mjs then build/esm/bin.js
- **Verify:** File exists and is executable

### A6. Create scripts/copy-bin.mjs
- Implement build script to copy compiled bin to dist
- **Verify:** Script exists

### A7. Install dependencies
- Run `pnpm install` from monorepo root
- **Verify:** No install errors, node_modules linked

## Phase B: Core Logic (TDD)

### B1. Write Slug.test.ts (RED)
- Write failing tests for all slug cases: lowercase, spaces, special chars, collapse, trim
- Create minimal Slug.ts stub that exports `slugify` returning empty string
- **Verify:** `pnpm test` runs, tests FAIL (red)

### B2. Implement Slug.ts (GREEN)
- Implement `slugify` function per design algorithm
- **Verify:** `pnpm test` passes, all slug tests GREEN

### B3. Write Validate.test.ts (RED)
- Write failing tests for `looksLikeFilename`, `looksLikeFlag`
- Create minimal Validate.ts stub with functions returning false
- **Verify:** `pnpm test` runs, validation tests FAIL (red)

### B4. Implement Validate.ts (GREEN)
- Implement `looksLikeFilename`, `looksLikeFlag`, `validateArgs`
- Define `ValidationError` tagged error
- **Verify:** `pnpm test` passes, all validation tests GREEN

### B5. Write Note.test.ts (RED)
- Write failing tests for `makeFilename` and `makeContent` with fixed dates
- Create minimal Note.ts stub with functions returning empty strings
- **Verify:** `pnpm test` runs, note tests FAIL (red)

### B6. Implement Note.ts (GREEN)
- Implement `makeFilename`, `makeContent`, `createNote`
- Export `NoteOptions`, `NoteResult` types
- **Verify:** `pnpm test` passes, all note tests GREEN

## Phase C: CLI Wiring

### C1. Implement bin.ts
- Import from Note, Slug, Validate modules
- Define CLI command with Args.repeated + Args.atLeast(1)
- Wire validation, note creation, and success output
- Export `run` function for testability
- **Verify:** `pnpm check` passes

### C2. Implement index.ts
- Re-export public API from Note, Slug, Validate
- **Verify:** `pnpm check` passes

### C3. Manual CLI test
- Run `node --import tsx/esm bin.mjs test title here`
- **Verify:** Creates file, prints success message

### C4. Test validation errors
- Run with filename-like arg, flag-like arg, existing file
- **Verify:** Each case aborts with appropriate error message
- **Note:** Pretty error formatting (FR1.10) deferred pending guidance from Effect team on idiomatic approach

## Phase D: Build & Polish

### D1. Run full build
- `pnpm build`
- **Verify:** build/esm/ and dist/ populated, no errors

### D2. Test dist binary
- Run `./bin.mjs another test` after build
- **Verify:** Uses dist/bin.mjs, creates file correctly

### D3. Run all checks
- `pnpm check && pnpm lint && pnpm test`
- **Verify:** All pass with zero errors

### D4. Create README.md
- Document usage, examples, API
- **Verify:** File exists with proper content

### D5. Create LICENSE and CHANGELOG.md
- Copy LICENSE from another package
- Create empty CHANGELOG.md
- **Verify:** Files exist

## Phase E: Integration

### E1. Add to pnpm-workspace.yaml (if needed)
- Ensure packages-native/note is included
- **Verify:** `pnpm install` from root recognizes package

### E2. Final validation
- `pnpm build && pnpm check && pnpm lint && pnpm test` from package directory
- **Verify:** All green

### E3. Commit implementation
- Stage all new files
- Commit with descriptive message
- **Verify:** `git status` clean

## Progress Tracking

| Task | Status | Evidence |
|------|--------|----------|
| A1 | ⬜ | |
| A2 | ⬜ | |
| A3 | ⬜ | |
| A4 | ⬜ | |
| A5 | ⬜ | |
| A6 | ⬜ | |
| A7 | ⬜ | |
| B1 | ⬜ | |
| B2 | ⬜ | |
| B3 | ⬜ | |
| B4 | ⬜ | |
| B5 | ⬜ | |
| B6 | ⬜ | |
| C1 | ⬜ | |
| C2 | ⬜ | |
| C3 | ⬜ | |
| C4 | ⬜ | |
| D1 | ⬜ | |
| D2 | ⬜ | |
| D3 | ⬜ | |
| D4 | ⬜ | |
| D5 | ⬜ | |
| E1 | ⬜ | |
| E2 | ⬜ | |
| E3 | ⬜ | |
