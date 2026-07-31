# Example Suggestions: `effect/Cron`

- **Package:** `effect`
- **Source:** `packages/effect/src/Cron.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 0 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                | Line | Kind               | Priority     |
| ------------------ | ---: | ------------------ | ------------ |
| `effect/Cron.prev` |  752 | `root-declaration` | **optional** |

## Optional

### `effect/Cron.prev`

- **Source:** `packages/effect/src/Cron.ts:752`
- **Kind / category:** `root-declaration` / `getters`
- **Priority:** **optional**
- **Current description:** Returns the previous scheduled date/time for the given Cron instance.
- **Signature hint:** `declare function prev(cron: Cron, now?: DateTime.DateTime.Input): Date`
- **Import guidance:** Start from `import { Cron } from "effect"` and use `Cron.prev`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns the previous scheduled date/time for the given Cron instance. Call `Cron.prev` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
