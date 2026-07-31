# Example Suggestions: `effect/unstable/workers/WorkerError`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/workers/WorkerError.ts`
- **Uncovered API records:** 10
- **Priorities:** 0 required, 1 recommended, 7 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                   | Line | Kind               | Priority        |
| --------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/workers/WorkerError.isWorkerError`                   |   29 | `root-declaration` | **recommended** |
| `effect/unstable/workers/WorkerError.WorkerSpawnError`                |   37 | `root-declaration` | **optional**    |
| `effect/unstable/workers/WorkerError.WorkerSendError`                 |   51 | `root-declaration` | **optional**    |
| `effect/unstable/workers/WorkerError.WorkerReceiveError`              |   66 | `root-declaration` | **optional**    |
| `effect/unstable/workers/WorkerError.WorkerUnknownError`              |   80 | `root-declaration` | **optional**    |
| `effect/unstable/workers/WorkerError.WorkerErrorReason (type) (type)` |   94 | `root-declaration` | **optional**    |
| `effect/unstable/workers/WorkerError.WorkerErrorReason (type) (type)` |  106 | `root-declaration` | **optional**    |
| `effect/unstable/workers/WorkerError.WorkerError`                     |  125 | `root-declaration` | **optional**    |
| `effect/unstable/workers/WorkerError.TypeId`                          |   21 | `root-declaration` | **discouraged** |
| `effect/unstable/workers/WorkerError.WorkerError.TypeId`              |  143 | `member`           | **discouraged** |

## Recommended

### `effect/unstable/workers/WorkerError.isWorkerError`

- **Source:** `packages/effect/src/unstable/workers/WorkerError.ts:29`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is a `WorkerError`.
- **Signature hint:** `declare function isWorkerError(u: unknown): u is WorkerError`
- **Import guidance:** Start from `import { WorkerError } from "effect/unstable/workers"` and use `WorkerError.isWorkerError`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `WorkerError.isWorkerError` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/workers/WorkerError.WorkerSpawnError`

- **Source:** `packages/effect/src/unstable/workers/WorkerError.ts:37`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Worker error reason for failures while spawning or setting up a worker.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { WorkerError } from "effect/unstable/workers"` and use `WorkerError.WorkerSpawnError`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `WorkerError.WorkerSpawnError`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workers/WorkerError.WorkerSendError`

- **Source:** `packages/effect/src/unstable/workers/WorkerError.ts:51`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Worker error reason for failures while sending a message to a worker.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { WorkerError } from "effect/unstable/workers"` and use `WorkerError.WorkerSendError`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `WorkerError.WorkerSendError`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workers/WorkerError.WorkerReceiveError`

- **Source:** `packages/effect/src/unstable/workers/WorkerError.ts:66`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Worker error reason for failures while receiving or handling a message from a worker.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { WorkerError } from "effect/unstable/workers"` and use `WorkerError.WorkerReceiveError`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `WorkerError.WorkerReceiveError`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workers/WorkerError.WorkerUnknownError`

- **Source:** `packages/effect/src/unstable/workers/WorkerError.ts:80`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Worker error reason for an unclassified worker failure.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { WorkerError } from "effect/unstable/workers"` and use `WorkerError.WorkerUnknownError`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `WorkerError.WorkerUnknownError`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workers/WorkerError.WorkerErrorReason (type) (type)`

- **Source:** `packages/effect/src/unstable/workers/WorkerError.ts:94`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Union of the specific failure reasons that can be wrapped by a `WorkerError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workers/WorkerError.WorkerErrorReason (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workers/WorkerError.WorkerErrorReason (type) (type)`

- **Source:** `packages/effect/src/unstable/workers/WorkerError.ts:106`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Schema for decoding and encoding all supported worker error reason variants.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { WorkerError } from "effect/unstable/workers"` and use `WorkerError.WorkerErrorReason`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `WorkerError.WorkerErrorReason`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workers/WorkerError.WorkerError`

- **Source:** `packages/effect/src/unstable/workers/WorkerError.ts:125`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Error raised by worker APIs, wrapping a specific `WorkerErrorReason` and exposing its message and cause.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { WorkerError } from "effect/unstable/workers"` and use `WorkerError.WorkerError`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `WorkerError.WorkerError`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/workers/WorkerError.TypeId`

- **Source:** `packages/effect/src/unstable/workers/WorkerError.ts:21`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to brand `WorkerError` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/workers/WorkerError.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/workers/WorkerError.WorkerError.TypeId`

- **Source:** `packages/effect/src/unstable/workers/WorkerError.ts:143`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a worker error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/workers/WorkerError.WorkerError.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
