# Example Suggestions: `effect/unstable/reactivity/AtomRegistry`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/reactivity/AtomRegistry.ts`
- **Uncovered API records:** 13
- **Priorities:** 0 required, 8 recommended, 3 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                            | Line | Kind               | Priority        |
| -------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/reactivity/AtomRegistry.layerOptions`         |  156 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/AtomRegistry.layer`                |  181 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/AtomRegistry.mount`                |  294 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/AtomRegistry.isAtomRegistry`       |   50 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/AtomRegistry.AtomRegistry (value)` |  143 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/AtomRegistry.toStream`             |  198 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/AtomRegistry.toStreamResult`       |  228 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/AtomRegistry.getResult`            |  254 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/AtomRegistry.make`                 |  117 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/AtomRegistry.AtomRegistry (type)`  |   64 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/AtomRegistry.Node`                 |   96 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/AtomRegistry.TypeId (type)`        |   34 | `root-declaration` | **discouraged** |
| `effect/unstable/reactivity/AtomRegistry.TypeId (value)`       |   42 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/reactivity/AtomRegistry.layerOptions`

- **Source:** `packages/effect/src/unstable/reactivity/AtomRegistry.ts:156`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer that provides an `AtomRegistry` configured with the supplied options.
- **Signature hint:** `declare function layerOptions(options?: { readonly initialValues?: Iterable<readonly [Atom.Atom<any>, any]> | undefined; readonly scheduleTask?: ((f: () => void) => () => void) | undefined; readonly timeoutResolution?: number | undefined; readonly defaultIdleTTL?: number | undefined; }): Layer.Layer<AtomRegistry>`
- **Import guidance:** Start from `import { AtomRegistry } from "effect/unstable/reactivity"` and use `AtomRegistry.layerOptions`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `AtomRegistry.layerOptions`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AtomRegistry.layer`

- **Source:** `packages/effect/src/unstable/reactivity/AtomRegistry.ts:181`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** The default layer that provides a fresh `AtomRegistry`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AtomRegistry } from "effect/unstable/reactivity"` and use `AtomRegistry.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `AtomRegistry.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AtomRegistry.mount`

- **Source:** `packages/effect/src/unstable/reactivity/AtomRegistry.ts:294`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Mounts an atom in this registry for the lifetime of the current scope.
- **Signature hint:** `declare function mount<A>(atom: Atom.Atom<A>): (self: AtomRegistry) => Effect.Effect<void, never, Scope.Scope> declare function mount<A>(self: AtomRegistry, atom: Atom.Atom<A>): Effect.Effect<void, never, Scope.Scope>`
- **Import guidance:** Start from `import { AtomRegistry } from "effect/unstable/reactivity"` and use `AtomRegistry.mount`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `AtomRegistry.mount`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AtomRegistry.isAtomRegistry`

- **Source:** `packages/effect/src/unstable/reactivity/AtomRegistry.ts:50`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when the value has the `AtomRegistry` type id.
- **Signature hint:** `declare function isAtomRegistry(u: unknown): u is AtomRegistry`
- **Import guidance:** Start from `import { AtomRegistry } from "effect/unstable/reactivity"` and use `AtomRegistry.isAtomRegistry`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `AtomRegistry.isAtomRegistry` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AtomRegistry.AtomRegistry (value)`

- **Source:** `packages/effect/src/unstable/reactivity/AtomRegistry.ts:143`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the active atom runtime cache.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AtomRegistry } from "effect/unstable/reactivity"` and use `AtomRegistry.AtomRegistry`.
- **Suggested snippet:** Consume `AtomRegistry.AtomRegistry` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AtomRegistry.toStream`

- **Source:** `packages/effect/src/unstable/reactivity/AtomRegistry.ts:198`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Converts an atom in this registry into a stream.
- **Signature hint:** `declare function toStream<A>(atom: Atom.Atom<A>): (self: AtomRegistry) => Stream.Stream<A> declare function toStream<A>(self: AtomRegistry, atom: Atom.Atom<A>): Stream.Stream<A>`
- **Import guidance:** Start from `import { AtomRegistry } from "effect/unstable/reactivity"` and use `AtomRegistry.toStream`.
- **Suggested snippet:** Create a finite stream, apply `AtomRegistry.toStream`, consume it with `Stream.runCollect` or `Stream.runForEach`, and assert the stable ordering, cardinality, or failure behavior. Bound any potentially infinite stream first.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AtomRegistry.toStreamResult`

- **Source:** `packages/effect/src/unstable/reactivity/AtomRegistry.ts:228`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Converts an `AsyncResult` atom in this registry into a stream of successful values.
- **Signature hint:** `declare function toStreamResult<A, E>(atom: Atom.Atom<Result.AsyncResult<A, E>>): (self: AtomRegistry) => Stream.Stream<A, E> declare function toStreamResult<A, E>(self: AtomRegistry, atom: Atom.Atom<Result.AsyncResult<A, E>>): Stream.Stream<A, E>`
- **Import guidance:** Start from `import { AtomRegistry } from "effect/unstable/reactivity"` and use `AtomRegistry.toStreamResult`.
- **Suggested snippet:** Create a finite stream, apply `AtomRegistry.toStreamResult`, consume it with `Stream.runCollect` or `Stream.runForEach`, and assert the stable ordering, cardinality, or failure behavior. Bound any potentially infinite stream first.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AtomRegistry.getResult`

- **Source:** `packages/effect/src/unstable/reactivity/AtomRegistry.ts:254`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Reads an `AsyncResult` atom from this registry as an effect.
- **Signature hint:** `declare function getResult<A, E>(atom: Atom.Atom<Result.AsyncResult<A, E>>, options?: { readonly suspendOnWaiting?: boolean | undefined; }): (self: AtomRegistry) => Effect.Effect<A, E> declare function getResult<A, E>(self: AtomRegistry, atom: Atom.Atom<Result.AsyncResult<A, E>>, options?: { readonly suspendOnWaiting?: boolean | undefined; }): Effect.Effect<A, E>`
- **Import guidance:** Start from `import { AtomRegistry } from "effect/unstable/reactivity"` and use `AtomRegistry.getResult`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `AtomRegistry.getResult`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/reactivity/AtomRegistry.make`

- **Source:** `packages/effect/src/unstable/reactivity/AtomRegistry.ts:117`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates an `AtomRegistry`.
- **Signature hint:** `declare function make(options?: { readonly initialValues?: Iterable<readonly [Atom.Atom<any>, any]> | undefined; readonly scheduleTask?: ((f: () => void) => () => void) | undefined; readonly timeoutResolution?: number | undefined; readonly defaultIdleTTL?: number | undefined; } | undefined): AtomRegistry`
- **Import guidance:** Start from `import { AtomRegistry } from "effect/unstable/reactivity"` and use `AtomRegistry.make`.
- **Suggested snippet:** Construct one representative value with `AtomRegistry.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AtomRegistry.AtomRegistry (type)`

- **Source:** `packages/effect/src/unstable/reactivity/AtomRegistry.ts:64`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The runtime registry that stores atom nodes and coordinates reads, writes, refreshes, subscriptions, and disposal.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/AtomRegistry.AtomRegistry`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AtomRegistry.Node`

- **Source:** `packages/effect/src/unstable/reactivity/AtomRegistry.ts:96`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A registry node for a single atom.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/AtomRegistry.Node`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/reactivity/AtomRegistry.TypeId (type)`

- **Source:** `packages/effect/src/unstable/reactivity/AtomRegistry.ts:34`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** The literal type used to identify `AtomRegistry` services and values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/reactivity/AtomRegistry.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/reactivity/AtomRegistry.TypeId (value)`

- **Source:** `packages/effect/src/unstable/reactivity/AtomRegistry.ts:42`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** The runtime type id used to identify `AtomRegistry` services and values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AtomRegistry } from "effect/unstable/reactivity"` and use `AtomRegistry.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `AtomRegistry.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
