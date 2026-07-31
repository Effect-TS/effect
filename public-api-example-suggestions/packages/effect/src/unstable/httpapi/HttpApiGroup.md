# Example Suggestions: `effect/unstable/httpapi/HttpApiGroup`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts`
- **Uncovered API records:** 28
- **Priorities:** 0 required, 1 recommended, 27 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                        | Line | Kind               | Priority        |
| -------------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/httpapi/HttpApiGroup.isHttpApiGroup`                      |   32 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiGroup.make`                                |  394 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup`                        |   52 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.identifier`             |   64 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.add`                    |   73 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.prefix`                 |   81 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.middleware`             |   93 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.annotateMerge`          |  102 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.annotate`               |  107 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.annotateEndpointsMerge` |  116 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.annotateEndpoints`      |  125 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.Service`                             |  142 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.ToService`                           |  160 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.Constraint`                          |  171 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.Top`                                 |  185 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.WithIdentifier`                      |  193 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.Identifier`                          |  201 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.Endpoints`                           |  209 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.ErrorServicesEncode`                 |  220 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.ErrorServicesDecode`                 |  229 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.MiddlewareError`                     |  237 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.MiddlewareProvides`                  |  246 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.MiddlewareClient`                    |  254 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.MiddlewareServices`                  |  262 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.EndpointsWithIdentifier`             |  270 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.ClientServices`                      |  280 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.AddPrefix`                           |  290 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiGroup.AddMiddleware`                       |  301 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/httpapi/HttpApiGroup.isHttpApiGroup`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:32`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is an `HttpApiGroup`, narrowing the value to the group interface.
- **Signature hint:** `declare function isHttpApiGroup(u: unknown): u is Top`
- **Import guidance:** Start from `import { HttpApiGroup } from "effect/unstable/httpapi"` and use `HttpApiGroup.isHttpApiGroup`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `HttpApiGroup.isHttpApiGroup` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/httpapi/HttpApiGroup.make`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:394`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates an empty `HttpApiGroup` with the supplied identifier.
- **Signature hint:** `declare function make<const Id extends string, const TopLevel extends boolean = false>(identifier: Id, options?: { readonly topLevel?: TopLevel | undefined; }): HttpApiGroup<Id, never, TopLevel>`
- **Import guidance:** Start from `import { HttpApiGroup } from "effect/unstable/httpapi"` and use `HttpApiGroup.make`.
- **Suggested snippet:** Construct one representative value with `HttpApiGroup.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:52`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** An `HttpApiGroup` is a named collection of `HttpApiEndpoint`s that represents a portion of your domain.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.identifier`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:64`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Stable group identifier. This field intentionally is not named `name` because `HttpApiGroup` values can be extended as classes, where `name` would collide with JavaScript's built-in `Function.name`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.identifier` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.add`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:73`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Add an `HttpApiEndpoint` to an `HttpApiGroup`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.add` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.prefix`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:81`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Add a path prefix to all endpoints in an `HttpApiGroup`. Note that this will only add the prefix to the endpoints before this api is called.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.prefix` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.middleware`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:93`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Adds an `HttpApiMiddleware` to every endpoint currently in the group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.middleware` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.annotateMerge`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:102`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Merge the annotations of an `HttpApiGroup` with the provided annotations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.annotateMerge` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.annotate`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:107`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Add an annotation to an `HttpApiGroup`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.annotate` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.annotateEndpointsMerge`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:116`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Merges the provided context into every endpoint currently in the group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.annotateEndpointsMerge` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.annotateEndpoints`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:125`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Adds an annotation to every endpoint currently in the group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiGroup.HttpApiGroup.annotateEndpoints` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.Service`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:142`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level service produced by the layer that implements one group of an HTTP API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiGroup.Service`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.ToService`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:160`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Derives the group implementation service required for each group in an HTTP API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiGroup.ToService`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.Constraint`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:171`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A widened `HttpApiGroup` type used when the concrete group identifier, endpoints, and top-level flag are not needed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiGroup.Constraint`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.Top`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:185`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A widened group type that preserves concrete runtime properties such as identifier, key, top-level status, endpoints, and annotations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiGroup.Top`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.WithIdentifier`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:193`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Selects the group with the specified identifier from a union of groups.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiGroup.WithIdentifier`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.Identifier`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:201`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the identifier literal from an `HttpApiGroup`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiGroup.Identifier`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.Endpoints`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:209`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the endpoint union contained in an `HttpApiGroup`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiGroup.Endpoints`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.ErrorServicesEncode`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:220`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes the services required to encode error responses for every endpoint in a group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiGroup.ErrorServicesEncode`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.ErrorServicesDecode`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:229`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes the services required to decode error responses for every endpoint in a group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiGroup.ErrorServicesDecode`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.MiddlewareError`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:237`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes the middleware error union for every endpoint in a group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiGroup.MiddlewareError`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.MiddlewareProvides`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:246`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes the services provided by middleware attached to any endpoint in a group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiGroup.MiddlewareProvides`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.MiddlewareClient`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:254`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes the client-side middleware services required by endpoints in a group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiGroup.MiddlewareClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.MiddlewareServices`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:262`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the runtime services required by middleware attached to the endpoints in an `HttpApiGroup`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiGroup.MiddlewareServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.EndpointsWithIdentifier`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:270`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the endpoint union from the group with the specified identifier.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiGroup.EndpointsWithIdentifier`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.ClientServices`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:280`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes the schema encoding and decoding services required by clients for all endpoints in a group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiGroup.ClientServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.AddPrefix`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:290`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Returns the type of a group after adding the supplied path prefix to each endpoint in the group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiGroup.AddPrefix`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiGroup.AddMiddleware`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiGroup.ts:301`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Returns the type of a group after applying a middleware identifier to every endpoint in the group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiGroup.AddMiddleware`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
