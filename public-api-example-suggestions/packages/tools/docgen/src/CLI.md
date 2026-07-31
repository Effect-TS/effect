# Example Suggestions: `@effect/docgen/CLI`

- **Package:** `@effect/docgen`
- **Source:** `packages/tools/docgen/src/CLI.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                      | Line | Kind               | Priority        |
| ------------------------ | ---: | ------------------ | --------------- |
| `@effect/docgen/CLI.cli` |  242 | `root-declaration` | **recommended** |

## Recommended

### `@effect/docgen/CLI.cli`

- **Source:** `packages/tools/docgen/src/CLI.ts:242`
- **Kind / category:** `root-declaration` / `CLI`
- **Priority:** **recommended**
- **Current description:** Runs the docgen command-line program.
- **Signature hint:** `declare function cli(input: ReadonlyArray<string>): Effect.Effect<void, PlatformError | CliError.CliError | Domain.DocgenError, Command.Environment | Domain.Process>`
- **Import guidance:** Start from `import { cli } from "@effect/docgen/CLI"` and use `cli`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `cli`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
