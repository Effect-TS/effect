# Agent Instructions

This is the Effect library repository, focusing on functional programming patterns and effect systems in TypeScript.

## Development Workflow

- The git base branch is `main`
- Use `pnpm` as the package manager

### Core Principles

- **Zero Tolerance for Errors**: All automated checks must pass
- **Clarity over Cleverness**: Choose clear, maintainable solutions
- **Conciseness**: Keep code and any wording concise and to the point. Sacrifice grammar for the sake of concision.
- **Reduce comments**: Avoid comments unless absolutely required to explain unusual or complex logic. Comments in jsdocs are acceptable.

### Mandatory Validation Steps

- Run `pnpm lint-fix` after editing files
- Always run tests after making changes: `pnpm test run <test_file.ts>`
- Run type checking: `pnpm check`
  - If type checking continues to fail, run `pnpm clean` to clear caches, then re-run `pnpm check`
- Build the project: `pnpm build`
- Check JSDoc examples compile: `pnpm docgen`

## Code Style Guidelines

**Always** look at existing code in the repository to learn and follow
established patterns before writing new code.

Do not worry about getting code formatting perfect while writing. Use `pnpm lint-fix`
to automatically format code according to the project's style guidelines.

### Barrel files

The `index.ts` files are automatically generated. Do not manually edit them. Use
`pnpm codegen` to regenerate barrel files after adding or removing modules.

## Changesets

All pull requests must include a changeset in the `.changeset/` directory.
This is important for maintaining a clear changelog and ensuring proper versioning of packages.

## Running test code

If you need to run some code for testing or debugging purposes, create a new
file in the `scratchpad/` directory at the root of the repository. You can then
run the file with `tsx scratchpad/your-file.ts`.

Make sure to delete the file after you are done testing.

## Testing

Before writing tests, look at existing tests in the codebase for similar
functionality to follow established patterns.

- Test files are located in `packages/*/test/` directories for each package
- Main Effect library tests: `packages/effect/test/`
- Always verify implementations with tests
- Run specific tests with: `pnpm test <filename>`

### it.effect Testing Pattern

- Use `it.effect` for all Effect-based tests, not `Effect.runSync` with regular `it`
- Import `{ assert, describe, it }` from `@effect/vitest`
- Never use `expect` from vitest in Effect tests - use `assert` methods instead
- All tests should use `it.effect("description", () => Effect.gen(function*() { ... }))`

Before writing tests, look at existing tests in the codebase for similar
functionality to follow established patterns.

## Learning about "effect" v4

If you need to learn more about the new version of effect (version 4), you can
access the repository here:

\`.repos/effect-v4\`
