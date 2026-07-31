# Example Suggestions: `effect/ErrorReporter`

- **Package:** `effect`
- **Source:** `packages/effect/src/ErrorReporter.ts`
- **Uncovered API records:** 11
- **Priorities:** 0 required, 3 recommended, 6 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                          | Line | Kind               | Priority        |
| -------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/ErrorReporter.CurrentErrorReporters` |  176 | `root-declaration` | **recommended** |
| `effect/ErrorReporter.getSeverity`           |  471 | `root-declaration` | **recommended** |
| `effect/ErrorReporter.getAttributes`         |  563 | `root-declaration` | **recommended** |
| `effect/ErrorReporter.ignore`                |  349 | `root-declaration` | **optional**    |
| `effect/ErrorReporter.severity`              |  420 | `root-declaration` | **optional**    |
| `effect/ErrorReporter.attributes`            |  495 | `root-declaration` | **optional**    |
| `effect/ErrorReporter.Reportable`            |  321 | `root-declaration` | **optional**    |
| `effect/ErrorReporter.isIgnored`             |  401 | `root-declaration` | **optional**    |
| `effect/ErrorReporter.ErrorReporter`         |   76 | `root-declaration` | **optional**    |
| `effect/ErrorReporter.TypeId (type)`         |   36 | `root-declaration` | **discouraged** |
| `effect/ErrorReporter.TypeId (value)`        |   50 | `root-declaration` | **discouraged** |

## Recommended

### `effect/ErrorReporter.CurrentErrorReporters`

- **Source:** `packages/effect/src/ErrorReporter.ts:176`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **recommended**
- **Current description:** Context reference that holds the set of active error reporters for the current fiber. Defaults to an empty set (no reporting).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ErrorReporter } from "effect"` and use `ErrorReporter.CurrentErrorReporters`.
- **Suggested snippet:** Consume `ErrorReporter.CurrentErrorReporters` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ErrorReporter.getSeverity`

- **Source:** `packages/effect/src/ErrorReporter.ts:471`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **recommended**
- **Current description:** Reads the `ErrorReporter.severity` annotation from an error object, falling back to `"Info"` when the annotation is unset or invalid.
- **Signature hint:** `declare function getSeverity(error: object): Severity`
- **Import guidance:** Start from `import { ErrorReporter } from "effect"` and use `ErrorReporter.getSeverity`.
- **Suggested snippet:** Create a small representative input, call `ErrorReporter.getSeverity`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ErrorReporter.getAttributes`

- **Source:** `packages/effect/src/ErrorReporter.ts:563`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **recommended**
- **Current description:** Reads the `ErrorReporter.attributes` annotation from an error object, returning an empty record when unset.
- **Signature hint:** `declare function getAttributes(error: object): ReadonlyRecord<string, unknown>`
- **Import guidance:** Start from `import { ErrorReporter } from "effect"` and use `ErrorReporter.getAttributes`.
- **Suggested snippet:** Create a small representative input, call `ErrorReporter.getAttributes`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/ErrorReporter.ignore`

- **Source:** `packages/effect/src/ErrorReporter.ts:349`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Defines the string property key used to mark an object error as ignored by error reporting.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/ErrorReporter.ignore`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ErrorReporter.severity`

- **Source:** `packages/effect/src/ErrorReporter.ts:420`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Defines the string property key used to override the severity level of an object error.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/ErrorReporter.severity`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ErrorReporter.attributes`

- **Source:** `packages/effect/src/ErrorReporter.ts:495`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Defines the string property key used to attach extra key/value metadata to an object error report.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/ErrorReporter.attributes`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ErrorReporter.Reportable`

- **Source:** `packages/effect/src/ErrorReporter.ts:321`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Interface that object errors can implement to control reporting behavior.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/ErrorReporter.Reportable`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ErrorReporter.isIgnored`

- **Source:** `packages/effect/src/ErrorReporter.ts:401`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Returns `true` if the given value has the `ErrorReporter.ignore` annotation set to `true`.
- **Signature hint:** `declare function isIgnored(u: unknown): boolean`
- **Import guidance:** Start from `import { ErrorReporter } from "effect"` and use `ErrorReporter.isIgnored`.
- **Suggested snippet:** Create two values within the accepted input domain, one satisfying the documented condition and one not, call `ErrorReporter.isIgnored`, and assert `true` and `false`. Do not claim TypeScript narrowing because the signature returns only `boolean`.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ErrorReporter.ErrorReporter`

- **Source:** `packages/effect/src/ErrorReporter.ts:76`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** An `ErrorReporter` receives reported failures and forwards them to an external system such as a logging service or error tracker.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/ErrorReporter.ErrorReporter`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/ErrorReporter.TypeId (type)`

- **Source:** `packages/effect/src/ErrorReporter.ts:36`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** String literal type used as the runtime type identifier for `ErrorReporter` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/ErrorReporter.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/ErrorReporter.TypeId (value)`

- **Source:** `packages/effect/src/ErrorReporter.ts:50`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier attached to `ErrorReporter` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ErrorReporter } from "effect"` and use `ErrorReporter.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `ErrorReporter.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
