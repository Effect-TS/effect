# Example Suggestions: `effect/unstable/cluster/EntityResource`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/EntityResource.ts`
- **Uncovered API records:** 6
- **Priorities:** 1 required, 2 recommended, 1 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                     | Line | Kind               | Priority        |
| ------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/EntityResource.CloseScope`     |   72 | `root-declaration` | **required**    |
| `effect/unstable/cluster/EntityResource.make`           |   98 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/EntityResource.makeK8sPod`     |  162 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/EntityResource.EntityResource` |   51 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/EntityResource.TypeId (value)` |   30 | `root-declaration` | **discouraged** |
| `effect/unstable/cluster/EntityResource.TypeId (type)`  |   38 | `root-declaration` | **discouraged** |

## Required

### `effect/unstable/cluster/EntityResource.CloseScope`

- **Source:** `packages/effect/src/unstable/cluster/EntityResource.ts:72`
- **Kind / category:** `root-declaration` / `resource management`
- **Priority:** **required**
- **Current description:** Context service for a Scope that is only closed when the resource is explicitly closed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EntityResource } from "effect/unstable/cluster"` and use `EntityResource.CloseScope`.
- **Suggested snippet:** Consume `EntityResource.CloseScope` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

## Recommended

### `effect/unstable/cluster/EntityResource.make`

- **Source:** `packages/effect/src/unstable/cluster/EntityResource.ts:98`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an `EntityResource` that can be acquired inside a cluster entity.
- **Signature hint:** `declare function make<A, E, R>(options: { readonly acquire: Effect.Effect<A, E, R>; readonly idleTimeToLive?: Duration.Input | undefined; readonly acquireEagerly?: boolean | undefined; }): Effect.Effect<EntityResource<A, E>, E, Scope.Scope | Exclude<R, CloseScope> | Sharding | Entity.CurrentAddress>`
- **Import guidance:** Start from `import { EntityResource } from "effect/unstable/cluster"` and use `EntityResource.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `EntityResource.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/EntityResource.makeK8sPod`

- **Source:** `packages/effect/src/unstable/cluster/EntityResource.ts:162`
- **Kind / category:** `root-declaration` / `Kubernetes`
- **Priority:** **recommended**
- **Current description:** Creates an `EntityResource` backed by a Kubernetes Pod.
- **Signature hint:** `declare function makeK8sPod(spec: v1.Pod, options?: { readonly idleTimeToLive?: Duration.Input | undefined; } | undefined): Effect.Effect<EntityResource<K8sHttpClient.PodStatus>, never, Scope.Scope | Sharding | Entity.CurrentAddress | K8sHttpClient.K8sHttpClient>`
- **Import guidance:** Start from `import { EntityResource } from "effect/unstable/cluster"` and use `EntityResource.makeK8sPod`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `EntityResource.makeK8sPod`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cluster/EntityResource.EntityResource`

- **Source:** `packages/effect/src/unstable/cluster/EntityResource.ts:51`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A resource acquired inside a cluster entity and kept alive across restarts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/EntityResource.EntityResource`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/cluster/EntityResource.TypeId (value)`

- **Source:** `packages/effect/src/unstable/cluster/EntityResource.ts:30`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type identifier used to brand `EntityResource` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EntityResource } from "effect/unstable/cluster"` and use `EntityResource.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `EntityResource.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/cluster/EntityResource.TypeId (type)`

- **Source:** `packages/effect/src/unstable/cluster/EntityResource.ts:38`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Literal type of the `EntityResource` type identifier.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cluster/EntityResource.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
