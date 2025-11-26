# Requirements: note

This document formalizes the requirements for a minimal CLI tool that creates timestamped markdown notes from the command line.

## FR1 – Functional Requirements

### FR1.1 – Command Invocation
- **When** the user runs `npx note <title words...>`,
  **then** the CLI shall join all positional arguments into a title string separated by spaces.

### FR1.2 – Title Validation
- **When** no positional arguments are provided,
  **then** the CLI shall exit with a non-zero code and print an error message indicating a title is required.

### FR1.2.1 – Filename Argument Detection
- **If** any positional argument appears to be a filename (contains a dot and no spaces),
  **then** the CLI shall abort with a non-zero code and print an error message explaining that the tool creates filenames automatically and does not accept filename arguments.

### FR1.2.2 – Existing File Detection  
- **If** any positional argument matches an existing file in the current directory,
  **then** the CLI shall abort with a non-zero code and print an error message indicating the user may have confused this tool with another command.

### FR1.2.3 – Flag Argument Detection
- **If** any positional argument appears to be a flag or option (starts with `-` or `--`, or contains `=`),
  **then** the CLI shall abort with a non-zero code and display the help text.
- **Rationale:** Preserves option space for future CLI flags; prevents users from developing habits that would break when flags are added later.

### FR1.3 – Slug Generation
- **When** generating the filename slug from the title,
  **then** the CLI shall:
  - FR1.3.1: Convert the title to lowercase
  - FR1.3.2: Replace spaces with hyphens
  - FR1.3.3: Remove characters that are not alphanumeric or hyphens
  - FR1.3.4: Collapse consecutive hyphens into a single hyphen
  - FR1.3.5: Trim leading and trailing hyphens

### FR1.4 – Filename Format
- The CLI shall generate filenames in the format: `note-YYYY-MM-DD-<slug>.md`
- The date shall be the current local date in ISO format (YYYY-MM-DD).

### FR1.5 – File Content
- **When** creating the note file,
  **then** the CLI shall write:
  - FR1.5.1: A level-1 markdown heading containing the original title (preserving case and spaces)
  - FR1.5.2: A blank line
  - FR1.5.3: A line containing `Created: <ISO-8601-timestamp>` with full precision (e.g., `2025-11-26T14:30:56.886Z`)

### FR1.6 – File Creation
- **When** the note content is generated,
  **then** the CLI shall write the file to the current working directory.

### FR1.6.1 – No Overwrite
- **If** a file with the generated filename already exists,
  **then** the CLI shall abort with a non-zero code and print an error message indicating the file already exists.
- **Rationale:** Prevents accidental data loss; user must explicitly handle conflicts.

### FR1.7 – Success Output
- **When** the file is successfully created,
  **then** the CLI shall print to stdout: `✅ Created: <filename>`

### FR1.8 – Success Exit
- **When** the file is successfully created,
  **then** the CLI shall exit with code 0.

### FR1.9 – Error Handling
- **If** the file cannot be written (e.g., permission denied, disk full),
  **then** the CLI shall print an error message to stderr and exit with a non-zero code.

### FR1.10 – Pretty Error Messages
- **When** displaying error messages,
  **then** the CLI shall:
  - FR1.10.1: Show a concise, user-friendly message (not raw schema validation paths or stack traces)
  - FR1.10.2: Include actionable guidance (e.g., "Usage: note <title words...>")
  - FR1.10.3: Exit cleanly without logging internal Effect error structures

## NFR2 – Non-Functional Requirements

### NFR2.1 – Performance
- The CLI shall complete execution in under 500ms for typical usage.

### NFR2.2 – Dependencies
- The CLI shall use Effect ecosystem libraries (`@effect/cli`, `@effect/platform`, `@effect/platform-node`).
- The CLI shall have minimal runtime dependencies.

### NFR2.3 – Compatibility
- The CLI shall support Node.js >= 20.19.6 LTS.
- The CLI shall be executable via `npx note`.

### NFR2.4 – Package Identity
- The package shall be published as `note` (top-level, unscoped) on npm.

## TC3 – Technical Constraints

### TC3.1 – Package Location
- The package shall reside at `packages-native/note/` in the monorepo.

### TC3.2 – Build System
- The package shall use the standard Effect monorepo build tooling (`@effect/build-utils`, tsconfig inheritance).

### TC3.3 – Binary Entry
- The `package.json` shall define a `bin` field mapping `note` to the compiled CLI entry point.

### TC3.4 – ESM
- The package shall be ESM-only (`"type": "module"`).

## DR4 – Data Requirements

### DR4.1 – Output File Schema
```
# <title>

Created: <ISO-8601-timestamp>
```

### DR4.2 – Filename Schema
```
note-<YYYY-MM-DD>-<slug>.md
```

Where:
- `YYYY-MM-DD` is the current local date
- `slug` is the slugified title per FR1.3

## SC5 – Success Criteria

- SC5.1: `pnpm build`, `pnpm check`, `pnpm lint` pass with zero errors.
- SC5.2: Unit tests cover slug generation edge cases (special characters, multiple spaces, empty after slugification).
- SC5.3: Integration test verifies end-to-end file creation.
- SC5.4: `npx note this is the title of my note` produces the expected file and output.
- SC5.5: Error cases (no title, write failure) produce appropriate messages and exit codes.
