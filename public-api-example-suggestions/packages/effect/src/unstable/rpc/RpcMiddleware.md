# Example Suggestions: `effect/unstable/rpc/RpcMiddleware`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/rpc/RpcMiddleware.ts`
- **Uncovered API records:** 20
- **Priorities:** 0 required, 2 recommended, 16 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                     | Line | Kind               | Priority        |
| ------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/rpc/RpcMiddleware.layerClient`         |  324 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcMiddleware.Service`             |  258 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcMiddleware.RpcMiddleware`       |   47 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMiddleware.SuccessValue`        |   67 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMiddleware.RpcMiddlewareClient` |   78 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMiddleware.ForClient`           |   93 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMiddleware.Any`                 |  105 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMiddleware.AnyId`               |  125 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMiddleware.ServiceClass`        |  141 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMiddleware.Provides`            |  170 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMiddleware.Requires`            |  178 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMiddleware.ApplyServices`       |  187 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMiddleware.ErrorSchema`         |  195 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMiddleware.Error`               |  205 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMiddleware.ErrorServicesEncode` |  213 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMiddleware.ErrorServicesDecode` |  221 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMiddleware.AnyService`          |  229 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMiddleware.AnyServiceWithProps` |  243 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMiddleware.TypeId (type)`       |   29 | `root-declaration` | **discouraged** |
| `effect/unstable/rpc/RpcMiddleware.TypeId (value)`      |   37 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/rpc/RpcMiddleware.layerClient`

- **Source:** `packages/effect/src/unstable/rpc/RpcMiddleware.ts:324`
- **Kind / category:** `root-declaration` / `client`
- **Priority:** **recommended**
- **Current description:** Provides the client-side implementation for an RPC middleware service, capturing the layer's environment and merging it into each middleware invocation.
- **Signature hint:** `declare function layerClient<Id extends AnyId, S, R, EX = never, RX = never>(tag: Context.Key<Id, S>, service: RpcMiddlewareClient<Id[TypeId]['error']['Type'], Id[TypeId]['clientError'], R> | Effect.Effect<RpcMiddlewareClient<Id[TypeId]['error']['Type'], Id[TypeId]['clientError'], R>, EX, RX>): Layer.Layer<ForClient<Id>, EX, R | Exclude<RX, Scope>>`
- **Import guidance:** Start from `import { RpcMiddleware } from "effect/unstable/rpc"` and use `RpcMiddleware.layerClient`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `RpcMiddleware.layerClient`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcMiddleware.Service`

- **Source:** `packages/effect/src/unstable/rpc/RpcMiddleware.ts:258`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a typed RPC middleware service class, with optional service requirements, provided services, error schema, and client-side requirement metadata.
- **Signature hint:** `declare function Service<Self, Config extends { requires?: any; provides?: any; clientError?: any; } = { requires: never; provides: never; clientError: never; }>(): <const Name extends string, Error extends Schema.Top = Schema.Never, const RequiredForClient extends boolean = false>(id: Name, options?: { readonly error?: Error | undefined; readonly requiredForClient?: RequiredForClient | undefined; } | undefined) => ServiceClass<Self, Name, 'provides' extends keyof Config ? Config['provides'] : never, Error, 'clientError' extends keyof Config ? Config['clientError'] : never, 'requires' extends keyof Config ? Config['requires'] : never, RequiredForClient>`
- **Import guidance:** Start from `import { RpcMiddleware } from "effect/unstable/rpc"` and use `RpcMiddleware.Service`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a typed RPC middleware service class, with optional service requirements, provided services, error schema, and client-side requirement metadata. Call `RpcMiddleware.Service` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/rpc/RpcMiddleware.RpcMiddleware`

- **Source:** `packages/effect/src/unstable/rpc/RpcMiddleware.ts:47`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The server-side RPC middleware function shape, wrapping a handler effect with access to request metadata and translating provided services into required services.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMiddleware.RpcMiddleware`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMiddleware.SuccessValue`

- **Source:** `packages/effect/src/unstable/rpc/RpcMiddleware.ts:67`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Marker success type used by RPC middleware to represent successful completion without exposing the handler's concrete success value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMiddleware.SuccessValue`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMiddleware.RpcMiddlewareClient`

- **Source:** `packages/effect/src/unstable/rpc/RpcMiddleware.ts:78`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The client-side RPC middleware function shape, allowing outgoing requests to be inspected or modified before calling `next`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMiddleware.RpcMiddlewareClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMiddleware.ForClient`

- **Source:** `packages/effect/src/unstable/rpc/RpcMiddleware.ts:93`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Marker service requirement indicating that a middleware has a client-side implementation available for an RPC client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMiddleware.ForClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMiddleware.Any`

- **Source:** `packages/effect/src/unstable/rpc/RpcMiddleware.ts:105`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** An erased server-side RPC middleware function, useful when the concrete provided services, errors, and requirements are not needed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMiddleware.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMiddleware.AnyId`

- **Source:** `packages/effect/src/unstable/rpc/RpcMiddleware.ts:125`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A type-level carrier for RPC middleware metadata, including provided services, required services, error schema, and client error type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMiddleware.AnyId`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMiddleware.ServiceClass`

- **Source:** `packages/effect/src/unstable/rpc/RpcMiddleware.ts:141`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The `Context.Service` class shape created for an RPC middleware, including its error schema, service metadata, and client-side requirement marker.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMiddleware.ServiceClass`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMiddleware.Provides`

- **Source:** `packages/effect/src/unstable/rpc/RpcMiddleware.ts:170`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the services provided by an RPC middleware.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMiddleware.Provides`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMiddleware.Requires`

- **Source:** `packages/effect/src/unstable/rpc/RpcMiddleware.ts:178`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the services required by an RPC middleware.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMiddleware.Requires`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMiddleware.ApplyServices`

- **Source:** `packages/effect/src/unstable/rpc/RpcMiddleware.ts:187`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Applies a middleware's service transformation to an RPC environment by removing services the middleware provides and adding services it requires.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMiddleware.ApplyServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMiddleware.ErrorSchema`

- **Source:** `packages/effect/src/unstable/rpc/RpcMiddleware.ts:195`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the error schema associated with an RPC middleware.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMiddleware.ErrorSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMiddleware.Error`

- **Source:** `packages/effect/src/unstable/rpc/RpcMiddleware.ts:205`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the decoded error type produced by an RPC middleware.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMiddleware.Error`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMiddleware.ErrorServicesEncode`

- **Source:** `packages/effect/src/unstable/rpc/RpcMiddleware.ts:213`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the encoding services required by a middleware's error schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMiddleware.ErrorServicesEncode`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMiddleware.ErrorServicesDecode`

- **Source:** `packages/effect/src/unstable/rpc/RpcMiddleware.ts:221`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the decoding services required by a middleware's error schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMiddleware.ErrorServicesDecode`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMiddleware.AnyService`

- **Source:** `packages/effect/src/unstable/rpc/RpcMiddleware.ts:229`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** An erased RPC middleware context key carrying middleware metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMiddleware.AnyService`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMiddleware.AnyServiceWithProps`

- **Source:** `packages/effect/src/unstable/rpc/RpcMiddleware.ts:243`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** An erased RPC middleware context key whose service value is a server-side middleware function.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMiddleware.AnyServiceWithProps`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/rpc/RpcMiddleware.TypeId (type)`

- **Source:** `packages/effect/src/unstable/rpc/RpcMiddleware.ts:29`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** The literal type id used to identify RPC middleware service classes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/rpc/RpcMiddleware.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/rpc/RpcMiddleware.TypeId (value)`

- **Source:** `packages/effect/src/unstable/rpc/RpcMiddleware.ts:37`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** The runtime type id used to attach and inspect RPC middleware metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcMiddleware } from "effect/unstable/rpc"` and use `RpcMiddleware.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcMiddleware.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
