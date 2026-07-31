# Example Suggestions: `@effect/platform-bun/BunHttpPlatform`

- **Package:** `@effect/platform-bun`
- **Source:** `packages/platform-bun/src/BunHttpPlatform.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                          | Line | Kind               | Priority        |
| -------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-bun/BunHttpPlatform.layer` |   48 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-bun/BunHttpPlatform.layer`

- **Source:** `packages/platform-bun/src/BunHttpPlatform.ts:48`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides the Bun `HttpPlatform`, including file responses backed by `Bun.file`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BunHttpPlatform } from "@effect/platform-bun"` and use `BunHttpPlatform.layer`.
- **Suggested snippet:** Use `BunHttpPlatform.layer` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
