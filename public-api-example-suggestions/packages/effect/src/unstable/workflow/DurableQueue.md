# Example Suggestions: `effect/unstable/workflow/DurableQueue`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/workflow/DurableQueue.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 3 recommended, 1 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                    | Line | Kind               | Priority        |
| ------------------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/unstable/workflow/DurableQueue.worker`         |  342 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/DurableQueue.process`        |  178 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/DurableQueue.makeWorker`     |  255 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/DurableQueue.DurableQueue`   |   46 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/DurableQueue.TypeId (type)`  |   29 | `root-declaration` | **discouraged** |
| `effect/unstable/workflow/DurableQueue.TypeId (value)` |   37 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/workflow/DurableQueue.worker`

- **Source:** `packages/effect/src/unstable/workflow/DurableQueue.ts:342`
- **Kind / category:** `root-declaration` / `Worker`
- **Priority:** **recommended**
- **Current description:** Create a layer that runs workers for the durable queue.
- **Signature hint:** `declare function worker<Payload extends Schema.Top, Success extends Schema.Top, Error extends Schema.Top, R>(self: DurableQueue<Payload, Success, Error>, f: (payload: Payload['Type']) => Effect.Effect<Success['Type'], Error['Type'], R>, options?: { readonly concurrency?: number | undefined; } | undefined): Layer.Layer<never, never, WorkflowEngine | PersistedQueue.PersistedQueueFactory | R | Payload['EncodingServices'] | Payload['DecodingServices'] | Success['EncodingServices'] | Error['EncodingServices']>`
- **Import guidance:** Start from `import { DurableQueue } from "effect/unstable/workflow"` and use `DurableQueue.worker`.
- **Suggested snippet:** Use the public setup or registry consumed by `DurableQueue.worker`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/DurableQueue.process`

- **Source:** `packages/effect/src/unstable/workflow/DurableQueue.ts:178`
- **Kind / category:** `root-declaration` / `Processing`
- **Priority:** **recommended**
- **Current description:** Adds an item to the queue and wait for a worker to process it.
- **Signature hint:** `declare function process<Payload extends Schema.Top, Success extends Schema.Top, Error extends Schema.Top>(self: DurableQueue<Payload, Success, Error>, payload: Payload['~type.make.in'], options?: { readonly retrySchedule?: Schedule.Schedule<any, PersistedQueue.PersistedQueueError> | undefined; }): Effect.Effect<Success['Type'], Error['Type'], WorkflowEngine | WorkflowInstance | PersistedQueue.PersistedQueueFactory | Payload['EncodingServices'] | Payload['DecodingServices'] | Success['DecodingServices'] | Error['DecodingServices']>`
- **Import guidance:** Start from `import { DurableQueue } from "effect/unstable/workflow"` and use `DurableQueue.process`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `DurableQueue.process`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/DurableQueue.makeWorker`

- **Source:** `packages/effect/src/unstable/workflow/DurableQueue.ts:255`
- **Kind / category:** `root-declaration` / `Worker`
- **Priority:** **recommended**
- **Current description:** Create a worker effect that processes items from the durable queue.
- **Signature hint:** `declare function makeWorker<Payload extends Schema.Top, Success extends Schema.Top, Error extends Schema.Top, R>(self: DurableQueue<Payload, Success, Error>, f: (payload: Payload['Type']) => Effect.Effect<Success['Type'], Error['Type'], R>, options?: { readonly concurrency?: number | undefined; } | undefined): Effect.Effect<never, never, WorkflowEngine | PersistedQueue.PersistedQueueFactory | R | Payload['EncodingServices'] | Payload['DecodingServices'] | Success['EncodingServices'] | Error['EncodingServices']>`
- **Import guidance:** Start from `import { DurableQueue } from "effect/unstable/workflow"` and use `DurableQueue.makeWorker`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `DurableQueue.makeWorker`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/workflow/DurableQueue.DurableQueue`

- **Source:** `packages/effect/src/unstable/workflow/DurableQueue.ts:46`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Durable workflow queue definition containing a payload schema, idempotency key, and deferred used to await worker results.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/DurableQueue.DurableQueue`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/workflow/DurableQueue.TypeId (type)`

- **Source:** `packages/effect/src/unstable/workflow/DurableQueue.ts:29`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to recognize `DurableQueue` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/workflow/DurableQueue.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/workflow/DurableQueue.TypeId (value)`

- **Source:** `packages/effect/src/unstable/workflow/DurableQueue.ts:37`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime identifier attached to `DurableQueue` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DurableQueue } from "effect/unstable/workflow"` and use `DurableQueue.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `DurableQueue.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
