# Example Suggestions: `@effect/bundle/Cli`

- **Package:** `@effect/bundle`
- **Source:** `packages/tools/bundle/src/Cli.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 0 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                      | Line | Kind               | Priority     |
| ------------------------ | ---: | ------------------ | ------------ |
| `@effect/bundle/Cli.cli` |  121 | `root-declaration` | **optional** |

## Optional

### `@effect/bundle/Cli.cli`

- **Source:** `packages/tools/bundle/src/Cli.ts:121`
- **Kind / category:** `root-declaration` / `commands`
- **Priority:** **optional**
- **Current description:** Bundle analysis CLI command with subcommands for comparing fixture bundle sizes, reporting selected fixtures, and generating visualizations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { cli } from "@effect/bundle/Cli"` and use `cli`.
- **Suggested snippet:** Use `cli` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
