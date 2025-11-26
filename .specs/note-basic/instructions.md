# note — Phase 1 Instructions

## Overview

A minimal CLI tool for creating timestamped markdown notes from the command line. The tool captures a title as positional arguments and generates a dated markdown file in the current directory.

- Package name: `note` (top-level, unscoped)
- Primary value: Quick note creation with consistent naming and timestamps
- Example invocation: `npx note this is the title of my note`

## Personas & User Stories

1) Developer taking quick notes
   - As a developer who wants to capture a thought quickly, I want to run a single command with my note title as arguments, so that a properly formatted markdown file is created without interrupting my flow.

2) Documentation-oriented user
   - As someone who organizes notes by date, I want the generated filename to include the current date, so that notes are naturally sorted chronologically in the filesystem.

## Core Requirements

- Accept note title as variadic positional arguments (all args after the command become the title)
- Generate a markdown file with:
  - Filename format: `note-YYYY-MM-DD-slugified-title.md`
  - Header: `# original title with spaces`
  - Timestamp line: `Created: YYYY-MM-DDTHH:MM:SS.sssZ` (ISO 8601)
- Print confirmation: `Created: note-YYYY-MM-DD-slugified-title.md`
- Write the file to the current working directory

### Slug Rules

- Convert title to lowercase
- Replace spaces with hyphens
- Strip or replace non-alphanumeric characters (except hyphens)
- Collapse multiple consecutive hyphens

### Dependencies

- Use `@effect/cli` for command-line argument parsing
- Use `@effect/platform` for filesystem operations
- Use `@effect/platform-node` for Node.js runtime integration
- Effect ecosystem peer dependencies

## Acceptance Criteria

- Running `npx note this is the title of my note` creates a file `note-2025-11-26-this-is-the-title-of-my-note.md`
- File contents match the specified format:
  ```md
  # this is the title of my note

  Created: 2025-11-26T14:30:56.886Z
  ```
- Success message printed to stdout: `Created: note-2025-11-26-this-is-the-title-of-my-note.md`
- Exit code 0 on success
- Informative error message and non-zero exit on failure (e.g., no title provided)
- Full repository validations pass: lint, typecheck, tests, build

## Out of Scope (v1)

- Custom output directory (always writes to cwd)
- Template customization
- Tags or categories
- Opening the file in an editor after creation
- Reading from stdin
- Interactive mode
- Config file support

## Success Metrics

- 0 docgen/typecheck/lint/build errors in CI
- Tests cover: title slugification, file generation, error cases
- Clear, copy-pasteable example in README

## Future Considerations

- Optional `--dir` flag for custom output directory
- Optional `--template` flag for custom templates
- Optional `--open` flag to open in `$EDITOR`
- Tag support via `--tag` flag
- Integration with note-taking systems (Obsidian, Logseq, etc.)
