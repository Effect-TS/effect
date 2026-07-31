# Example Suggestions: `effect/unstable/workers/Worker`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/workers/Worker.ts`
- **Uncovered API records:** 9
- **Priorities:** 1 required, 2 recommended, 5 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                              | Line | Kind               | Priority        |
| ------------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/unstable/workers/Worker.makePlatform`    |  145 | `root-declaration` | **required**    |
| `effect/unstable/workers/Worker.layerSpawner`    |  133 | `root-declaration` | **recommended** |
| `effect/unstable/workers/Worker.Spawner (value)` |  111 | `root-declaration` | **recommended** |
| `effect/unstable/workers/Worker.WorkerPlatform`  |   29 | `root-declaration` | **optional**    |
| `effect/unstable/workers/Worker.Worker`          |   43 | `root-declaration` | **optional**    |
| `effect/unstable/workers/Worker.PlatformMessage` |   92 | `root-declaration` | **optional**    |
| `effect/unstable/workers/Worker.Spawner (type)`  |  101 | `root-declaration` | **optional**    |
| `effect/unstable/workers/Worker.SpawnerFn`       |  123 | `root-declaration` | **optional**    |
| `effect/unstable/workers/Worker.makeUnsafe`      |   66 | `root-declaration` | **discouraged** |

## Required

### `effect/unstable/workers/Worker.makePlatform`

- **Source:** `packages/effect/src/unstable/workers/Worker.ts:145`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **required**
- **Current description:** Creates a `WorkerPlatform` from platform-specific setup and listen hooks, buffering sent messages until the worker is ready and scoping port cleanup to the worker run.
- **Signature hint:** `declare function makePlatform<W>(): <P extends { readonly postMessage: (message: any, transfers?: any | undefined) => void; }>(options: { readonly setup: (options: { readonly worker: W; readonly scope: Scope.Scope; }) => Effect.Effect<P, WorkerError>; readonly listen: (options: { readonly port: P; readonly emit: (data: any) => void; readonly deferred: Deferred.Deferred<never, WorkerError>; readonly scope: Scope.Scope; }) => Effect.Effect<void>; }) => WorkerPlatform['Service']`
- **Import guidance:** Start from `import { Worker } from "effect/unstable/workers"` and use `Worker.makePlatform`.
- **Suggested snippet:** Construct one representative value with `Worker.makePlatform`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

## Recommended

### `effect/unstable/workers/Worker.layerSpawner`

- **Source:** `packages/effect/src/unstable/workers/Worker.ts:133`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer that provides a worker `Spawner` service from a `SpawnerFn`.
- **Signature hint:** `declare function layerSpawner<W = unknown>(spawner: SpawnerFn<W>): Layer.Layer<Spawner>`
- **Import guidance:** Start from `import { Worker } from "effect/unstable/workers"` and use `Worker.layerSpawner`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Worker.layerSpawner`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workers/Worker.Spawner (value)`

- **Source:** `packages/effect/src/unstable/workers/Worker.ts:111`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the worker `SpawnerFn`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Worker } from "effect/unstable/workers"` and use `Worker.Spawner`.
- **Suggested snippet:** Consume `Worker.Spawner` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/workers/Worker.WorkerPlatform`

- **Source:** `packages/effect/src/unstable/workers/Worker.ts:29`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Service that spawns effect `Worker` instances for numeric worker ids using the configured `Spawner`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Worker } from "effect/unstable/workers"` and use `Worker.WorkerPlatform`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Worker.WorkerPlatform`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workers/Worker.Worker`

- **Source:** `packages/effect/src/unstable/workers/Worker.ts:43`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Effect-based worker abstraction that can send input messages and run a long-lived handler for output messages, failing with `WorkerError` or handler errors.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workers/Worker.Worker`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workers/Worker.PlatformMessage`

- **Source:** `packages/effect/src/unstable/workers/Worker.ts:92`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Internal worker platform protocol message: `[0]` signals readiness and `[1, payload]` carries data.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workers/Worker.PlatformMessage`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workers/Worker.Spawner (type)`

- **Source:** `packages/effect/src/unstable/workers/Worker.ts:101`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Phantom identifier for the service that maps worker ids to platform-specific worker instances.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workers/Worker.Spawner`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workers/Worker.SpawnerFn`

- **Source:** `packages/effect/src/unstable/workers/Worker.ts:123`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Function that creates or locates a platform-specific worker instance for a numeric worker id.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workers/Worker.SpawnerFn`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/workers/Worker.makeUnsafe`

- **Source:** `packages/effect/src/unstable/workers/Worker.ts:66`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Wraps platform-specific send and run functions into a `Worker`, translating platform ready/data messages and running the optional `onSpawn` effect when the worker reports readiness.
- **Signature hint:** `declare function makeUnsafe(options: { readonly send: (message: unknown, transfers?: ReadonlyArray<unknown>) => Effect.Effect<void, WorkerError>; readonly run: <A, E, R>(handler: (message: PlatformMessage) => Effect.Effect<A, E, R>) => Effect.Effect<never, E | WorkerError, R>; }): Worker<any, any>`
- **Import guidance:** Start from `import { Worker } from "effect/unstable/workers"` and use `Worker.makeUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Worker.makeUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
