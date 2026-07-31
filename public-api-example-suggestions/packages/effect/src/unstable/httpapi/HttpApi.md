# Example Suggestions: `effect/unstable/httpapi/HttpApi`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/httpapi/HttpApi.ts`
- **Uncovered API records:** 13
- **Priorities:** 0 required, 2 recommended, 11 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                     | Line | Kind               | Priority        |
| ------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/httpapi/HttpApi.isHttpApi`             |   33 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApi.reflect`               |  247 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApi.make`                  |  229 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApi.AdditionalSchemas`     |  336 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApi.HttpApi`               |   54 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApi.HttpApi.add`           |   67 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApi.HttpApi.addHttpApi`    |   87 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApi.HttpApi.prefix`        |   94 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApi.HttpApi.middleware`    |  103 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApi.HttpApi.annotate`      |  110 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApi.HttpApi.annotateMerge` |  115 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApi.Constraint`            |  124 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApi.Top`                   |  135 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/httpapi/HttpApi.isHttpApi`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApi.ts:33`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is an `HttpApi`.
- **Signature hint:** `declare function isHttpApi(u: unknown): u is Top`
- **Import guidance:** Start from `import { HttpApi } from "effect/unstable/httpapi"` and use `HttpApi.isHttpApi`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `HttpApi.isHttpApi` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApi.reflect`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApi.ts:247`
- **Kind / category:** `root-declaration` / `reflection`
- **Priority:** **recommended**
- **Current description:** Describes the groups and endpoints in an `HttpApi`.
- **Signature hint:** `declare function reflect<Id extends string, Groups extends HttpApiGroup.Constraint>(self: HttpApi<Id, Groups>, options: { readonly predicate?: Predicate.Predicate<{ readonly endpoint: HttpApiEndpoint.Top; readonly group: HttpApiGroup.Top; }> | undefined; readonly onGroup: (options: { readonly group: HttpApiGroup.Top; readonly mergedAnnotations: Context.Context<never>; }) => void; readonly onEndpoint: (options: { readonly group: HttpApiGroup.Top; readonly endpoint: HttpApiEndpoint.Top; readonly mergedAnnotations: Context.Context<never>; readonly middleware: ReadonlySet<HttpApiMiddleware.AnyService>; readonly successes: ReadonlyMap<number, readonly [Schema.Top, ...Array<Schema.Top>]>; readonly errors: ReadonlyMap<number, readonly [Schema.Top, ...Array<Schema.Top>]>; }) => void; }): void`
- **Import guidance:** Start from `import { HttpApi } from "effect/unstable/httpapi"` and use `HttpApi.reflect`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Describes the groups and endpoints in an `HttpApi`. Call `HttpApi.reflect` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/httpapi/HttpApi.make`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApi.ts:229`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates an empty `HttpApi` with the supplied identifier.
- **Signature hint:** `declare function make<const Id extends string>(identifier: Id): HttpApi<Id, never>`
- **Import guidance:** Start from `import { HttpApi } from "effect/unstable/httpapi"` and use `HttpApi.make`.
- **Suggested snippet:** Construct one representative value with `HttpApi.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApi.AdditionalSchemas`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApi.ts:336`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **optional**
- **Current description:** Adds additional schemas to components/schemas. The provided schemas must have a `identifier` annotation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApi } from "effect/unstable/httpapi"` and use `HttpApi.AdditionalSchemas`.
- **Suggested snippet:** Consume `HttpApi.AdditionalSchemas` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApi.HttpApi`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApi.ts:54`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** An `HttpApi` is a collection of HTTP API groups and endpoints that represents a portion of your domain.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApi.HttpApi`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApi.HttpApi.add`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApi.ts:67`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Add a `HttpApiGroup` to the `HttpApi`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApi.HttpApi.add` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApi.HttpApi.addHttpApi`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApi.ts:87`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Adds every group from another `HttpApi` while preserving its annotation scope.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApi.HttpApi.addHttpApi` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApi.HttpApi.prefix`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApi.ts:94`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Prefix all endpoints in the `HttpApi`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApi.HttpApi.prefix` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApi.HttpApi.middleware`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApi.ts:103`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Adds a middleware to every endpoint currently in the `HttpApi`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApi.HttpApi.middleware` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApi.HttpApi.annotate`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApi.ts:110`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Annotate the `HttpApi`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApi.HttpApi.annotate` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApi.HttpApi.annotateMerge`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApi.ts:115`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Annotate the `HttpApi` with a Context.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApi.HttpApi.annotateMerge` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApi.Constraint`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApi.ts:124`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** An `HttpApi` value with its identifier and group types erased.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApi.Constraint`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApi.Top`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApi.ts:135`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** An `HttpApi` with broad identifier and group types while retaining the concrete runtime properties used by implementation helpers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApi.Top`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
