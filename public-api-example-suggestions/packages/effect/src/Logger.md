# Example Suggestions: `effect/Logger`

- **Package:** `effect`
- **Source:** `packages/effect/src/Logger.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 0 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                         | Line | Kind               | Priority     |
| --------------------------- | ---: | ------------------ | ------------ |
| `effect/Logger.LogToStderr` |  185 | `root-declaration` | **optional** |

## Optional

### `effect/Logger.LogToStderr`

- **Source:** `packages/effect/src/Logger.ts:185`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference that routes the built-in default logger and TTY pretty console logger to stderr.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Logger } from "effect"` and use `Logger.LogToStderr`.
- **Suggested snippet:** Consume `Logger.LogToStderr` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
