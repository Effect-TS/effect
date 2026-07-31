# Example Suggestions: `effect/unstable/sql/SqlConnection`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/sql/SqlConnection.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 1 recommended, 4 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                       | Line | Kind               | Priority        |
| --------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/sql/SqlConnection.Connection (value)`    |   80 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlConnection.Connection (type)`     |   26 | `root-declaration` | **optional**    |
| `effect/unstable/sql/SqlConnection.Connection.executeRaw` |   37 | `member`           | **optional**    |
| `effect/unstable/sql/SqlConnection.Acquirer`              |   72 | `root-declaration` | **optional**    |
| `effect/unstable/sql/SqlConnection.Row`                   |   88 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/sql/SqlConnection.Connection (value)`

- **Source:** `packages/effect/src/unstable/sql/SqlConnection.ts:80`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for a low-level SQL `Connection`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqlConnection } from "effect/unstable/sql"` and use `SqlConnection.Connection`.
- **Suggested snippet:** Consume `SqlConnection.Connection` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/sql/SqlConnection.Connection (type)`

- **Source:** `packages/effect/src/unstable/sql/SqlConnection.ts:26`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Low-level SQL driver connection capable of executing compiled SQL as transformed rows, raw results, streams, value arrays, or unprepared statements.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/SqlConnection.Connection`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlConnection.Connection.executeRaw`

- **Source:** `packages/effect/src/unstable/sql/SqlConnection.ts:37`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Execute the specified SQL query and return the raw results directly from underlying SQL client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/SqlConnection.Connection.executeRaw` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlConnection.Acquirer`

- **Source:** `packages/effect/src/unstable/sql/SqlConnection.ts:72`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Scoped effect that acquires a `Connection`, may fail with `SqlError`, and requires a `Scope` for release.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/SqlConnection.Acquirer`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlConnection.Row`

- **Source:** `packages/effect/src/unstable/sql/SqlConnection.ts:88`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Generic SQL row shape mapping column names to unknown values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/SqlConnection.Row`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
