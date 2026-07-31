# Example Suggestions: `@effect/doctest/Runner`

- **Package:** `@effect/doctest`
- **Source:** `packages/tools/doctest/src/Runner.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 0 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                           | Line | Kind               | Priority     |
| ----------------------------- | ---: | ------------------ | ------------ |
| `@effect/doctest/Runner.wrap` |   16 | `root-declaration` | **optional** |

## Optional

### `@effect/doctest/Runner.wrap`

- **Source:** `packages/tools/doctest/src/Runner.ts:16`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **optional**
- **Current description:** Wraps a Vitest runner so marked documentation files use doctest collectors.
- **Signature hint:** `declare function wrap(Base: typeof TestRunner): typeof TestRunner`
- **Import guidance:** Start from `import { Runner } from "@effect/doctest"` and use `Runner.wrap`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Wraps a Vitest runner so marked documentation files use doctest collectors. Call `Runner.wrap` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
