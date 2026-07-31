# Example Suggestions: `effect/Hash`

- **Package:** `effect`
- **Source:** `packages/effect/src/Hash.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 0 recommended, 0 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                  | Line | Kind               | Priority        |
| -------------------- | ---: | ------------------ | --------------- |
| `effect/Hash.symbol` |   31 | `root-declaration` | **discouraged** |

## Discouraged

### `effect/Hash.symbol`

- **Source:** `packages/effect/src/Hash.ts:31`
- **Kind / category:** `root-declaration` / `symbols`
- **Priority:** **discouraged**
- **Current description:** Defines the unique identifier used to identify objects that implement the Hash interface.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Hash } from "effect"` and use `Hash.symbol`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Hash.symbol` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
