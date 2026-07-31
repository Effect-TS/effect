# Example Suggestions: `effect/ManagedRuntime`

- **Package:** `effect`
- **Source:** `packages/effect/src/ManagedRuntime.ts`
- **Uncovered API records:** 14
- **Priorities:** 0 required, 1 recommended, 13 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                        | Line | Kind                    | Priority        |
| ---------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/ManagedRuntime.isManagedRuntime`                   |   45 | `root-declaration`      | **recommended** |
| `effect/ManagedRuntime.ManagedRuntime (type) (type)`       |   58 | `namespace`             | **optional**    |
| `effect/ManagedRuntime.ManagedRuntime.Services`            |   70 | `namespace-declaration` | **optional**    |
| `effect/ManagedRuntime.ManagedRuntime.Error`               |   83 | `namespace-declaration` | **optional**    |
| `effect/ManagedRuntime.ManagedRuntime (type) (type)`       |  112 | `root-declaration`      | **optional**    |
| `effect/ManagedRuntime.ManagedRuntime.runFork`             |  132 | `member`                | **optional**    |
| `effect/ManagedRuntime.ManagedRuntime.runSyncExit`         |  145 | `member`                | **optional**    |
| `effect/ManagedRuntime.ManagedRuntime.runSync`             |  155 | `member`                | **optional**    |
| `effect/ManagedRuntime.ManagedRuntime.runCallback`         |  166 | `member`                | **optional**    |
| `effect/ManagedRuntime.ManagedRuntime.runPromise`          |  185 | `member`                | **optional**    |
| `effect/ManagedRuntime.ManagedRuntime.runPromiseExit`      |  196 | `member`                | **optional**    |
| `effect/ManagedRuntime.ManagedRuntime.dispose`             |  208 | `member`                | **optional**    |
| `effect/ManagedRuntime.ManagedRuntime.Symbol.asyncDispose` |  218 | `member`                | **optional**    |
| `effect/ManagedRuntime.ManagedRuntime.disposeEffect`       |  227 | `member`                | **optional**    |

## Recommended

### `effect/ManagedRuntime.isManagedRuntime`

- **Source:** `packages/effect/src/ManagedRuntime.ts:45`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Checks whether the provided argument is a `ManagedRuntime`.
- **Signature hint:** `declare function isManagedRuntime(input: unknown): input is ManagedRuntime<unknown, unknown>`
- **Import guidance:** Start from `import { ManagedRuntime } from "effect"` and use `ManagedRuntime.isManagedRuntime`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `ManagedRuntime.isManagedRuntime` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/ManagedRuntime.ManagedRuntime (type) (type)`

- **Source:** `packages/effect/src/ManagedRuntime.ts:58`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Type helpers associated with `ManagedRuntime`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/ManagedRuntime.ManagedRuntime (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ManagedRuntime.ManagedRuntime.Services`

- **Source:** `packages/effect/src/ManagedRuntime.ts:70`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Extracts the services available from a `ManagedRuntime`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/ManagedRuntime.ManagedRuntime.Services`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ManagedRuntime.ManagedRuntime.Error`

- **Source:** `packages/effect/src/ManagedRuntime.ts:83`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Extracts the layer construction error type of a `ManagedRuntime`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/ManagedRuntime.ManagedRuntime.Error`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ManagedRuntime.ManagedRuntime (type) (type)`

- **Source:** `packages/effect/src/ManagedRuntime.ts:112`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A runtime built from a layer that can execute effects requiring that layer's services.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/ManagedRuntime.ManagedRuntime (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ManagedRuntime.ManagedRuntime.runFork`

- **Source:** `packages/effect/src/ManagedRuntime.ts:132`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Executes the effect using the provided Scheduler or using the global Scheduler if not provided
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/ManagedRuntime.ManagedRuntime.runFork` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ManagedRuntime.ManagedRuntime.runSyncExit`

- **Source:** `packages/effect/src/ManagedRuntime.ts:145`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Executes the effect synchronously returning the exit.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/ManagedRuntime.ManagedRuntime.runSyncExit` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ManagedRuntime.ManagedRuntime.runSync`

- **Source:** `packages/effect/src/ManagedRuntime.ts:155`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Executes the effect synchronously throwing in case of errors or async boundaries.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/ManagedRuntime.ManagedRuntime.runSync` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ManagedRuntime.ManagedRuntime.runCallback`

- **Source:** `packages/effect/src/ManagedRuntime.ts:166`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Executes the effect asynchronously, eventually passing the exit value to the specified callback.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/ManagedRuntime.ManagedRuntime.runCallback` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ManagedRuntime.ManagedRuntime.runPromise`

- **Source:** `packages/effect/src/ManagedRuntime.ts:185`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Runs the `Effect`, returning a JavaScript `Promise` that will be resolved with the value of the effect once the effect has been executed, or will be rejected with the first error or exception throw by the effect.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/ManagedRuntime.ManagedRuntime.runPromise` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ManagedRuntime.ManagedRuntime.runPromiseExit`

- **Source:** `packages/effect/src/ManagedRuntime.ts:196`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Runs the `Effect`, returning a JavaScript `Promise` that will be resolved with the `Exit` state of the effect once the effect has been executed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/ManagedRuntime.ManagedRuntime.runPromiseExit` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ManagedRuntime.ManagedRuntime.dispose`

- **Source:** `packages/effect/src/ManagedRuntime.ts:208`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Dispose of the resources associated with the runtime.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/ManagedRuntime.ManagedRuntime.dispose` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ManagedRuntime.ManagedRuntime.Symbol.asyncDispose`

- **Source:** `packages/effect/src/ManagedRuntime.ts:218`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Dispose of the resources associated with the runtime.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/ManagedRuntime.ManagedRuntime.Symbol.asyncDispose` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ManagedRuntime.ManagedRuntime.disposeEffect`

- **Source:** `packages/effect/src/ManagedRuntime.ts:227`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Dispose of the resources associated with the runtime.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/ManagedRuntime.ManagedRuntime.disposeEffect` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
