# Example Suggestions: `effect/Config`

- **Package:** `effect`
- **Source:** `packages/effect/src/Config.ts`
- **Uncovered API records:** 13
- **Priorities:** 0 required, 5 recommended, 8 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                            | Line | Kind               | Priority        |
| ------------------------------ | ---: | ------------------ | --------------- |
| `effect/Config.ConfigError`    |   71 | `root-declaration` | **recommended** |
| `effect/Config.Boolean`        |  693 | `root-declaration` | **recommended** |
| `effect/Config.Port`           |  716 | `root-declaration` | **recommended** |
| `effect/Config.LogLevel`       |  736 | `root-declaration` | **recommended** |
| `effect/Config.fail`           |  851 | `root-declaration` | **recommended** |
| `effect/Config.Wrap`           |  442 | `root-declaration` | **optional**    |
| `effect/Config.Array`          |  833 | `root-declaration` | **optional**    |
| `effect/Config.nonEmptyString` |  932 | `root-declaration` | **optional**    |
| `effect/Config.number`         |  954 | `root-declaration` | **optional**    |
| `effect/Config.finite`         |  975 | `root-declaration` | **optional**    |
| `effect/Config.int`            |  996 | `root-declaration` | **optional**    |
| `effect/Config.Config`         |  109 | `root-declaration` | **optional**    |
| `effect/Config.Success`        |  422 | `root-declaration` | **optional**    |

## Recommended

### `effect/Config.ConfigError`

- **Source:** `packages/effect/src/Config.ts:71`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Represents the error type produced when config loading or validation fails.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Config } from "effect"` and use `Config.ConfigError`.
- **Suggested snippet:** Create or capture `Config.ConfigError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Config.Boolean`

- **Source:** `packages/effect/src/Config.ts:693`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for boolean values encoded as strings.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Config } from "effect"` and use `Config.Boolean`.
- **Suggested snippet:** Use `Config.Boolean` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Config.Port`

- **Source:** `packages/effect/src/Config.ts:716`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for port numbers (integers in 1–65535).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Config } from "effect"` and use `Config.Port`.
- **Suggested snippet:** Use `Config.Port` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Config.LogLevel`

- **Source:** `packages/effect/src/Config.ts:736`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for `LogLevel` string literals.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Config } from "effect"` and use `Config.LogLevel`.
- **Suggested snippet:** Use `Config.LogLevel` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Config.fail`

- **Source:** `packages/effect/src/Config.ts:851`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a config that always fails with the given error.
- **Signature hint:** `declare function fail(err: SourceError | Schema.SchemaError): Config<never>`
- **Import guidance:** Start from `import { Config } from "effect"` and use `Config.fail`.
- **Suggested snippet:** Construct one representative value with `Config.fail`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Config.Wrap`

- **Source:** `packages/effect/src/Config.ts:442`
- **Kind / category:** `root-declaration` / `Wrap`
- **Priority:** **optional**
- **Current description:** Utility type that recursively replaces primitives with `Config` in a nested structure.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Config.Wrap`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Config.Array`

- **Source:** `packages/effect/src/Config.ts:833`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for array types that can also be parsed from a flat separated string.
- **Signature hint:** `declare function Array<V extends Schema.Constraint>(value: V, options?: { readonly separator?: string | undefined; }): Schema.Union<readonly [Schema.compose<Schema.$Array<V>, Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>>, Schema.$Array<V>]>`
- **Import guidance:** Start from `import { Config } from "effect"` and use `Config.Array`.
- **Suggested snippet:** Define the smallest domain Schema involving `Config.Array`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Config.nonEmptyString`

- **Source:** `packages/effect/src/Config.ts:932`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a config for a non-empty string value. Fails if the value is an empty string.
- **Signature hint:** `declare function nonEmptyString(name?: string): Config<string>`
- **Import guidance:** Start from `import { Config } from "effect"` and use `Config.nonEmptyString`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a config for a non-empty string value. Fails if the value is an empty string. Call `Config.nonEmptyString` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Config.number`

- **Source:** `packages/effect/src/Config.ts:954`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a config for a numeric value (including `NaN`, `Infinity`).
- **Signature hint:** `declare function number(name?: string): Config<number>`
- **Import guidance:** Start from `import { Config } from "effect"` and use `Config.number`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a config for a numeric value (including `NaN`, `Infinity`). Call `Config.number` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Config.finite`

- **Source:** `packages/effect/src/Config.ts:975`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a config for a finite number (rejects `NaN` and `Infinity`).
- **Signature hint:** `declare function finite(name?: string): Config<number>`
- **Import guidance:** Start from `import { Config } from "effect"` and use `Config.finite`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a config for a finite number (rejects `NaN` and `Infinity`). Call `Config.finite` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Config.int`

- **Source:** `packages/effect/src/Config.ts:996`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a config for an integer value. Rejects floats.
- **Signature hint:** `declare function int(name?: string): Config<number>`
- **Import guidance:** Start from `import { Config } from "effect"` and use `Config.int`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a config for an integer value. Rejects floats. Call `Config.int` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Config.Config`

- **Source:** `packages/effect/src/Config.ts:109`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A recipe for extracting a typed value `T` from a `ConfigProvider`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Config.Config`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Config.Success`

- **Source:** `packages/effect/src/Config.ts:422`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Extracts the successfully parsed value type from a `Config`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Config.Success`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
