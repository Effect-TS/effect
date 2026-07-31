# Example Suggestions: `@effect/platform-browser/Permissions`

- **Package:** `@effect/platform-browser`
- **Source:** `packages/platform-browser/src/Permissions.ts`
- **Uncovered API records:** 8
- **Priorities:** 0 required, 5 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                 | Line | Kind               | Priority        |
| ------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-browser/Permissions.PermissionsInvalidStateError` |   49 | `root-declaration` | **recommended** |
| `@effect/platform-browser/Permissions.PermissionsTypeError`         |   63 | `root-declaration` | **recommended** |
| `@effect/platform-browser/Permissions.PermissionsError`             |   85 | `root-declaration` | **recommended** |
| `@effect/platform-browser/Permissions.Permissions (value)`          |  113 | `root-declaration` | **recommended** |
| `@effect/platform-browser/Permissions.layer`                        |  131 | `root-declaration` | **recommended** |
| `@effect/platform-browser/Permissions.PermissionsErrorReason`       |   77 | `root-declaration` | **optional**    |
| `@effect/platform-browser/Permissions.Permissions (type)`           |   27 | `root-declaration` | **optional**    |
| `@effect/platform-browser/Permissions.Permissions.query`            |   33 | `member`           | **optional**    |

## Recommended

### `@effect/platform-browser/Permissions.PermissionsInvalidStateError`

- **Source:** `packages/platform-browser/src/Permissions.ts:49`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error reason for an `InvalidStateError` raised by the browser Permissions API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Permissions } from "@effect/platform-browser"` and use `Permissions.PermissionsInvalidStateError`.
- **Suggested snippet:** Create or capture `Permissions.PermissionsInvalidStateError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/Permissions.PermissionsTypeError`

- **Source:** `packages/platform-browser/src/Permissions.ts:63`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error reason for a `TypeError` raised by the browser Permissions API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Permissions } from "@effect/platform-browser"` and use `Permissions.PermissionsTypeError`.
- **Suggested snippet:** Create or capture `Permissions.PermissionsTypeError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/Permissions.PermissionsError`

- **Source:** `packages/platform-browser/src/Permissions.ts:85`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Tagged error wrapping a browser Permissions API failure reason.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Permissions } from "@effect/platform-browser"` and use `Permissions.PermissionsError`.
- **Suggested snippet:** Create or capture `Permissions.PermissionsError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/Permissions.Permissions (value)`

- **Source:** `packages/platform-browser/src/Permissions.ts:113`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for browser permission querying.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Permissions } from "@effect/platform-browser"` and use `Permissions.Permissions`.
- **Suggested snippet:** Consume `Permissions.Permissions` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/Permissions.layer`

- **Source:** `packages/platform-browser/src/Permissions.ts:131`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides the `Permissions` service using the browser `navigator.permissions` API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Permissions } from "@effect/platform-browser"` and use `Permissions.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Permissions.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-browser/Permissions.PermissionsErrorReason`

- **Source:** `packages/platform-browser/src/Permissions.ts:77`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **optional**
- **Current description:** Union of browser Permissions API error reasons represented by the service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/Permissions.PermissionsErrorReason`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/Permissions.Permissions (type)`

- **Source:** `packages/platform-browser/src/Permissions.ts:27`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Wrapper on the Permission API (`navigator.permissions`) with methods for querying status of permissions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/Permissions.Permissions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/Permissions.Permissions.query`

- **Source:** `packages/platform-browser/src/Permissions.ts:33`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns the state of a user permission on the global scope.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/platform-browser/Permissions.Permissions.query` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
