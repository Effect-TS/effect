This is the Effect TypeScript monorepo. The git base branch is `main`; use `pnpm` from the repository root.

## Layout

- Core library source, runtime tests, and type tests are in `packages/effect/src`, `packages/effect/test`, and
  `packages/effect/typetest`.
- Other package families include `packages/ai`, `packages/atom`, `packages/platform`, `packages/sql`, and
  `packages/tools`; standalone packages also live directly under `packages`.
- Package tests and type tests live beside source in `test` and `typetest` directories.
- AI documentation sources are in `ai-docs/src`.
- Changesets are in `.changeset`.
- Migration sources (v3-to-v4) are in `migration/annotations`.
- Task-specific repository conventions live in `.agents/skills`. Load the relevant skill and inspect nearby code before
  editing.

## Validation

Use the narrowest validation that covers the change:

| Change type                      | Validation                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| Code changes                     | `pnpm lint-fix`, targeted `pnpm test --run <test_file.ts>`, `pnpm check`           |
| Tests-only changes               | `pnpm lint-fix`, targeted `pnpm test --run <test_file.ts>`, `pnpm check`           |
| Type-level/API type changes      | Targeted `pnpm test-types <filename>`, plus `pnpm check` when source types changed |
| JSDoc text/category/link changes | `pnpm jsdocs --check`, `pnpm lint`                                                 |
| JSDoc example changes            | `pnpm jsdocs --check`, `pnpm lint`, root `pnpm doctest --run <files>`              |
| Docs-only changes                | `pnpm lint-fix`; no tests unless examples or code changed                          |

Never run bare `pnpm test` or `pnpm doctest`; both start the full suite in watch mode. Always pass `--run` and the
specific files covering the change. CI runs the full suite.

For an ad hoc runnable probe, create `scratchpad/<name>.ts`, run it with plain `node`, and remove it when finished.

Report any commands that could not be run.

After consumer-visible runtime, public API, entrypoint, lifecycle, or wire-format changes, invoke the `changesets`
skill. Independently invoke `v4-migration` when a v3-to-v4 mapping changes; a change may require either skill, both, or
neither.

## Generated Files

Do not edit generated output directly.

- Use the `library-development` skill for generated sections marked with `@barrel`.
- Use the `ai-docs` skill for `LLMS.md`.
- Use the `v4-migration` skill for `migration/v3-to-v4.md`.
