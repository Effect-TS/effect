# Example Suggestions: `@effect/doctest/Plugin`

- **Package:** `@effect/doctest`
- **Source:** `packages/tools/doctest/src/Plugin.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 0 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                             | Line | Kind               | Priority     |
| ------------------------------- | ---: | ------------------ | ------------ |
| `@effect/doctest/Plugin.plugin` |   37 | `root-declaration` | **optional** |

## Optional

### `@effect/doctest/Plugin.plugin`

- **Source:** `packages/tools/doctest/src/Plugin.ts:37`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **optional**
- **Current description:** Creates a Vite plugin that transforms marked documentation snippets into Vitest tests.
- **Signature hint:** `declare function plugin(): Plugin`
- **Import guidance:** Start from `import { Plugin } from "@effect/doctest"` and use `Plugin.plugin`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a Vite plugin that transforms marked documentation snippets into Vitest tests. Call `Plugin.plugin` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
