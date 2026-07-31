# Example Suggestions: `effect/unstable/workers/Transferable`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/workers/Transferable.ts`
- **Uncovered API records:** 10
- **Priorities:** 0 required, 6 recommended, 3 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                        | Line | Kind               | Priority        |
| ---------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/workers/Transferable.makeCollector`       |   72 | `root-declaration` | **recommended** |
| `effect/unstable/workers/Transferable.addAll`              |   81 | `root-declaration` | **recommended** |
| `effect/unstable/workers/Transferable.getterAddAll`        |   98 | `root-declaration` | **recommended** |
| `effect/unstable/workers/Transferable.schema`              |  131 | `root-declaration` | **recommended** |
| `effect/unstable/workers/Transferable.ImageData`           |  166 | `root-declaration` | **recommended** |
| `effect/unstable/workers/Transferable.MessagePort`         |  177 | `root-declaration` | **recommended** |
| `effect/unstable/workers/Transferable.Transferable`        |  117 | `root-declaration` | **optional**    |
| `effect/unstable/workers/Transferable.Uint8Array`          |  188 | `root-declaration` | **optional**    |
| `effect/unstable/workers/Transferable.Collector`           |   26 | `root-declaration` | **optional**    |
| `effect/unstable/workers/Transferable.makeCollectorUnsafe` |   44 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/workers/Transferable.makeCollector`

- **Source:** `packages/effect/src/unstable/workers/Transferable.ts:72`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Effect that creates a fresh `Collector` service for accumulating transferables.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Transferable } from "effect/unstable/workers"` and use `Transferable.makeCollector`.
- **Suggested snippet:** Construct one representative value with `Transferable.makeCollector`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workers/Transferable.addAll`

- **Source:** `packages/effect/src/unstable/workers/Transferable.ts:81`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Adds transferables to the current `Collector` when one is present in the context, and does nothing otherwise.
- **Signature hint:** `declare function addAll(tranferables: Iterable<globalThis.Transferable>): Effect.Effect<void>`
- **Import guidance:** Start from `import { Transferable } from "effect/unstable/workers"` and use `Transferable.addAll`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Transferable.addAll`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workers/Transferable.getterAddAll`

- **Source:** `packages/effect/src/unstable/workers/Transferable.ts:98`
- **Kind / category:** `root-declaration` / `getters`
- **Priority:** **recommended**
- **Current description:** Creates a schema getter that records transferables derived from a value in the current `Collector` while passing the value through unchanged.
- **Signature hint:** `declare function getterAddAll<A>(f: (_: A) => Iterable<globalThis.Transferable>): SchemaGetter.Getter<A, A>`
- **Import guidance:** Start from `import { Transferable } from "effect/unstable/workers"` and use `Transferable.getterAddAll`.
- **Suggested snippet:** Create a small representative input, call `Transferable.getterAddAll`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workers/Transferable.schema`

- **Source:** `packages/effect/src/unstable/workers/Transferable.ts:131`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Wraps a schema so encoding records transferables selected from the encoded value, enabling worker messages to populate a `postMessage` transfer list.
- **Signature hint:** `declare function schema<S extends Schema.Top>(f: (_: S['Encoded']) => Iterable<globalThis.Transferable>): (self: S) => Transferable<S> declare function schema<S extends Schema.Top>(self: S, f: (_: S['Encoded']) => Iterable<globalThis.Transferable>): Transferable<S>`
- **Import guidance:** Start from `import { Transferable } from "effect/unstable/workers"` and use `Transferable.schema`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Wraps a schema so encoding records transferables selected from the encoded value, enabling worker messages to populate a `postMessage` transfer list. Call `Transferable.schema` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workers/Transferable.ImageData`

- **Source:** `packages/effect/src/unstable/workers/Transferable.ts:166`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for transferring `ImageData` values with their pixel data buffer.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Transferable } from "effect/unstable/workers"` and use `Transferable.ImageData`.
- **Suggested snippet:** Use `Transferable.ImageData` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workers/Transferable.MessagePort`

- **Source:** `packages/effect/src/unstable/workers/Transferable.ts:177`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for transferring `MessagePort` values as transferable objects.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Transferable } from "effect/unstable/workers"` and use `Transferable.MessagePort`.
- **Suggested snippet:** Use `Transferable.MessagePort` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/workers/Transferable.Transferable`

- **Source:** `packages/effect/src/unstable/workers/Transferable.ts:117`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema wrapper whose encode path can record transferables with a `Collector` while preserving the wrapped schema's decoded type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workers/Transferable.Transferable`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workers/Transferable.Uint8Array`

- **Source:** `packages/effect/src/unstable/workers/Transferable.ts:188`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for transferring `Uint8Array` values with their backing buffer.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Transferable } from "effect/unstable/workers"` and use `Transferable.Uint8Array`.
- **Suggested snippet:** Use `Transferable.Uint8Array` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workers/Transferable.Collector`

- **Source:** `packages/effect/src/unstable/workers/Transferable.ts:26`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Service for collecting `Transferable` objects while encoding worker messages so they can be passed to `postMessage` transfer lists.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Transferable } from "effect/unstable/workers"` and use `Transferable.Collector`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Transferable.Collector`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/workers/Transferable.makeCollectorUnsafe`

- **Source:** `packages/effect/src/unstable/workers/Transferable.ts:44`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **discouraged**
- **Current description:** Creates a mutable `Collector` service directly, exposing unsafe synchronous methods for reading, adding, and clearing collected transferables.
- **Signature hint:** `declare function makeCollectorUnsafe(): Collector['Service']`
- **Import guidance:** Start from `import { Transferable } from "effect/unstable/workers"` and use `Transferable.makeCollectorUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Transferable.makeCollectorUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
