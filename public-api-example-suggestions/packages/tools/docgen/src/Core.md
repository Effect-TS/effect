# Example Suggestions: `@effect/docgen/Core`

- **Package:** `@effect/docgen`
- **Source:** `packages/tools/docgen/src/Core.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 0 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                     | Line | Kind               | Priority     |
| ------------------------------------------------------- | ---: | ------------------ | ------------ |
| `@effect/docgen/Core.SKIP_TYPE_CHECKING_FENCE_METADATA` |  179 | `root-declaration` | **optional** |

## Optional

### `@effect/docgen/Core.SKIP_TYPE_CHECKING_FENCE_METADATA`

- **Source:** `packages/tools/docgen/src/Core.ts:179`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **optional**
- **Current description:** Fence metadata that excludes an example from docgen type checking.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Core } from "@effect/docgen"` and use `Core.SKIP_TYPE_CHECKING_FENCE_METADATA`.
- **Suggested snippet:** Use `Core.SKIP_TYPE_CHECKING_FENCE_METADATA` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
