# Example Suggestions: `effect/LogLevel`

- **Package:** `effect`
- **Source:** `packages/effect/src/LogLevel.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 0 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                          | Line | Kind               | Priority     |
| ---------------------------- | ---: | ------------------ | ------------ |
| `effect/LogLevel.getOrdinal` |  198 | `root-declaration` | **optional** |
| `effect/LogLevel.Severity`   |   87 | `root-declaration` | **optional** |
| `effect/LogLevel.values`     |  114 | `root-declaration` | **optional** |

## Optional

### `effect/LogLevel.getOrdinal`

- **Source:** `packages/effect/src/LogLevel.ts:198`
- **Kind / category:** `root-declaration` / `ordering`
- **Priority:** **optional**
- **Current description:** Returns the ordinal value of the log level.
- **Signature hint:** `declare function getOrdinal(self: LogLevel): number`
- **Import guidance:** Start from `import { LogLevel } from "effect"` and use `LogLevel.getOrdinal`.
- **Suggested snippet:** Create a small representative input, call `LogLevel.getOrdinal`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/LogLevel.Severity`

- **Source:** `packages/effect/src/LogLevel.ts:87`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Log levels that represent actual message severities, excluding the `All` and `None` sentinel levels.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/LogLevel.Severity`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/LogLevel.values`

- **Source:** `packages/effect/src/LogLevel.ts:114`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Returns all `LogLevel` values in order from `All` through the concrete severities to `None`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { LogLevel } from "effect"` and use `LogLevel.values`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `LogLevel.values`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
