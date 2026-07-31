# Example Suggestions: `effect/unstable/httpapi/HttpApiEndpoint`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts`
- **Uncovered API records:** 61
- **Priorities:** 0 required, 9 recommended, 52 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                        | Line | Kind               | Priority        |
| -------------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/httpapi/HttpApiEndpoint.isHttpApiEndpoint`                |   45 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiEndpoint.make`                             |  964 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiEndpoint.get`                              | 1309 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiEndpoint.post`                             | 1317 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiEndpoint.put`                              | 1325 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiEndpoint.patch`                            | 1333 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiEndpoint.delete`                           | 1344 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiEndpoint.head`                             | 1353 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiEndpoint.options`                          | 1361 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiEndpoint.ParamsConstraint`                 |  875 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.HeadersConstraint`                |  886 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.QueryConstraint`                  |  897 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.PayloadConstraint`                |  912 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.SuccessConstraint`                |  937 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.ErrorConstraint`                  |  946 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.PayloadConstraintCodecs`          |  926 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.PayloadMap`                       |  128 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.HttpApiEndpoint`                  |  140 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.HttpApiEndpoint.prefix`           |  181 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.HttpApiEndpoint.middleware`       |  200 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.HttpApiEndpoint.annotate`         |  217 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.HttpApiEndpoint.annotateMerge`    |  237 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.Constraint`                       |  288 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.ConstraintRequest`                |  303 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.Top`                              |  318 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.Identifier`                       |  340 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.Success`                          |  348 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.Error`                            |  356 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.Params`                           |  364 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.Query`                            |  373 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.Payload`                          |  382 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.Headers`                          |  391 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.Middleware`                       |  400 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.MiddlewareProvides`               |  409 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.MiddlewareClient`                 |  417 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.MiddlewareError`                  |  426 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.Errors`                           |  435 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.ErrorServicesEncode`              |  446 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.Request`                          |  459 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.RequestRaw`                       |  470 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.ClientRequest`                    |  481 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.ClientResponseMode`               |  508 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.ServerServices`                   |  517 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.ClientServices`                   |  534 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.MiddlewareServices`               |  549 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.ErrorServicesDecode`              |  559 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.Handler`                          |  571 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.HandlerRaw`                       |  582 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.WithIdentifier`                   |  592 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.ExcludeIdentifier`                |  603 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.HandlerWithIdentifier`            |  615 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.HandlerRawWithIdentifier`         |  628 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.SuccessWithIdentifier`            |  641 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.ErrorsWithIdentifier`             |  652 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.ServerServicesWithIdentifier`     |  663 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.MiddlewareWithIdentifier`         |  674 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.MiddlewareServicesWithIdentifier` |  685 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.ExcludeProvidedWithIdentifier`    |  695 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.ExcludeProvided`                  |  707 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.AddPrefix`                        |  720 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiEndpoint.AddMiddleware`                    |  754 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/httpapi/HttpApiEndpoint.isHttpApiEndpoint`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:45`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is an `HttpApiEndpoint`, narrowing the value to the endpoint interface.
- **Signature hint:** `declare function isHttpApiEndpoint(u: unknown): u is Top`
- **Import guidance:** Start from `import { HttpApiEndpoint } from "effect/unstable/httpapi"` and use `HttpApiEndpoint.isHttpApiEndpoint`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `HttpApiEndpoint.isHttpApiEndpoint` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiEndpoint.make`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:964`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates endpoint constructors for a specific HTTP method. The resulting constructor builds an `HttpApiEndpoint` from an identifier, path, and optional request and response schemas, applying automatic JSON or string-tree codecs unless `disableCodecs` is enabled.
- **Signature hint:** `declare function make<Method extends HttpMethod>(method: Method): { <const Identifier extends string, const Path extends HttpRouter.PathInput, Params extends Schema.Top | Schema.Struct.Fields = never, Query extends Schema.Top | Schema.Struct.Fields = never, Payload extends PayloadConstraintCodecs<Method> = never, Headers extends Schema.Top | Schema.Struct.Fields = never, const Success extends SuccessConstraint = HttpApiSchema.NoContent, const Error extends Schema.Top | ReadonlyArray<Schema.Top> = never>(identifier: Identifier, path: Path, options?: { readonly disableCodecs?: false | undefined; readonly params?: Params | undefined; readonly query?: Query | undefined; readonly headers?: Headers | undefined; readonly payload?: Payload | undefined; readonly success?: Success | undefined; readonly error?: (Error & ErrorNoStream<Types.NoInfer<Error>>) | undefined; }): HttpApiEndpoint<Identifier, Method, Path, ToStringTreeCodec<Params>, ToStringTreeCodec<Query>, Method extends HttpMethod.WithBody ? ToJsonCodec<ToSchema<Payload>> : ToStringTreeCodec<ToSchema<Payload>>, ToStringTreeCodec<Headers>, ToSuccessCodec<Success>, ToJsonCodec<Error extends ReadonlyArray<Schema.Constraint> ? Error[number] : Error>>; <const Identifier extends string, const Path extends HttpRouter.PathInput, Params extends ParamsConstraint = never, Query extends QueryConstraint = never, Payload extends PayloadConstraint<Method> = never, Headers extends HeadersConstraint = never, const Success extends SuccessConstraint = HttpApiSchema.NoContent, const Error extends ErrorConstraint = never>(identifier: Identifier, path: Path, options?: { readonly disableCodecs: true; readonly params?: Params | undefined; readonly query?: Query | undefined; readonly headers?: Headers | undefined; readonly payload?: Payload | undefined; readonly success?: Success | undefined; readonly error?: (Error & ErrorNoStream<Types.NoInfer<Error>>) | undefined; }): HttpApiEndpoint<Identifier, Method, Path, Params extends Schema.Struct.Fields ? Schema.Struct<Params> : Params, Query extends Schema.Struct.Fields ? Schema.Struct<Query> : Query, ToSchema<Payload>, ToSchema<Headers>, UnwrapReadonlyArray<Success>, Error extends ReadonlyArray<Schema.Constraint> ? Error[number] : Error>; }`
- **Import guidance:** Start from `import { HttpApiEndpoint } from "effect/unstable/httpapi"` and use `HttpApiEndpoint.make`.
- **Suggested snippet:** Construct one representative value with `HttpApiEndpoint.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiEndpoint.get`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:1309`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `GET` endpoint declaration.
- **Signature hint:** `declare function get<const Identifier extends string, const Path extends HttpRouter.PathInput, Params extends Schema.Top | Schema.Struct.Fields = never, Query extends Schema.Top | Schema.Struct.Fields = never, Payload extends Record<string, Schema.Top> = never, Headers extends Schema.Top | Schema.Struct.Fields = never, const Success extends SuccessConstraint = HttpApiSchema.NoContent, const Error extends Schema.Top | ReadonlyArray<Schema.Top> = never>(identifier: Identifier, path: Path, options?: { readonly disableCodecs?: false | undefined; readonly params?: Params | undefined; readonly query?: Query | undefined; readonly headers?: Headers | undefined; readonly payload?: Payload | undefined; readonly success?: Success | undefined; readonly error?: (Error & ErrorNoStream<Types.NoInfer<Error>>) | undefined; } | undefined): HttpApiEndpoint<Identifier, 'GET', Path, ToStringTreeCodec<Params>, ToStringTreeCodec<Query>, ToStringTreeCodec<ToSchema<Payload>>, ToStringTreeCodec<Headers>, ToSuccessCodec<Success>, ToJsonCodec<Error extends readonly Schema.Constraint[] ? Error[number] : Error>, never, never>`
- **Import guidance:** Start from `import { HttpApiEndpoint } from "effect/unstable/httpapi"` and use `HttpApiEndpoint.get`.
- **Suggested snippet:** Create a small representative input, call `HttpApiEndpoint.get`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiEndpoint.post`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:1317`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `POST` endpoint declaration.
- **Signature hint:** `declare function post<const Identifier extends string, const Path extends HttpRouter.PathInput, Params extends Schema.Top | Schema.Struct.Fields = never, Query extends Schema.Top | Schema.Struct.Fields = never, Payload extends Schema.Top | readonly Schema.Top[] = never, Headers extends Schema.Top | Schema.Struct.Fields = never, const Success extends SuccessConstraint = HttpApiSchema.NoContent, const Error extends Schema.Top | ReadonlyArray<Schema.Top> = never>(identifier: Identifier, path: Path, options?: { readonly disableCodecs?: false | undefined; readonly params?: Params | undefined; readonly query?: Query | undefined; readonly headers?: Headers | undefined; readonly payload?: Payload | undefined; readonly success?: Success | undefined; readonly error?: (Error & ErrorNoStream<Types.NoInfer<Error>>) | undefined; } | undefined): HttpApiEndpoint<Identifier, 'POST', Path, ToStringTreeCodec<Params>, ToStringTreeCodec<Query>, ToJsonCodec<ToSchema<Payload>>, ToStringTreeCodec<Headers>, ToSuccessCodec<Success>, ToJsonCodec<Error extends readonly Schema.Constraint[] ? Error[number] : Error>, never, never>`
- **Import guidance:** Start from `import { HttpApiEndpoint } from "effect/unstable/httpapi"` and use `HttpApiEndpoint.post`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a `POST` endpoint declaration. Call `HttpApiEndpoint.post` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiEndpoint.put`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:1325`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `PUT` endpoint declaration.
- **Signature hint:** `declare function put<const Identifier extends string, const Path extends HttpRouter.PathInput, Params extends Schema.Top | Schema.Struct.Fields = never, Query extends Schema.Top | Schema.Struct.Fields = never, Payload extends Schema.Top | readonly Schema.Top[] = never, Headers extends Schema.Top | Schema.Struct.Fields = never, const Success extends SuccessConstraint = HttpApiSchema.NoContent, const Error extends Schema.Top | ReadonlyArray<Schema.Top> = never>(identifier: Identifier, path: Path, options?: { readonly disableCodecs?: false | undefined; readonly params?: Params | undefined; readonly query?: Query | undefined; readonly headers?: Headers | undefined; readonly payload?: Payload | undefined; readonly success?: Success | undefined; readonly error?: (Error & ErrorNoStream<Types.NoInfer<Error>>) | undefined; } | undefined): HttpApiEndpoint<Identifier, 'PUT', Path, ToStringTreeCodec<Params>, ToStringTreeCodec<Query>, ToJsonCodec<ToSchema<Payload>>, ToStringTreeCodec<Headers>, ToSuccessCodec<Success>, ToJsonCodec<Error extends readonly Schema.Constraint[] ? Error[number] : Error>, never, never>`
- **Import guidance:** Start from `import { HttpApiEndpoint } from "effect/unstable/httpapi"` and use `HttpApiEndpoint.put`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a `PUT` endpoint declaration. Call `HttpApiEndpoint.put` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiEndpoint.patch`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:1333`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `PATCH` endpoint declaration.
- **Signature hint:** `declare function patch<const Identifier extends string, const Path extends HttpRouter.PathInput, Params extends Schema.Top | Schema.Struct.Fields = never, Query extends Schema.Top | Schema.Struct.Fields = never, Payload extends Schema.Top | readonly Schema.Top[] = never, Headers extends Schema.Top | Schema.Struct.Fields = never, const Success extends SuccessConstraint = HttpApiSchema.NoContent, const Error extends Schema.Top | ReadonlyArray<Schema.Top> = never>(identifier: Identifier, path: Path, options?: { readonly disableCodecs?: false | undefined; readonly params?: Params | undefined; readonly query?: Query | undefined; readonly headers?: Headers | undefined; readonly payload?: Payload | undefined; readonly success?: Success | undefined; readonly error?: (Error & ErrorNoStream<Types.NoInfer<Error>>) | undefined; } | undefined): HttpApiEndpoint<Identifier, 'PATCH', Path, ToStringTreeCodec<Params>, ToStringTreeCodec<Query>, ToJsonCodec<ToSchema<Payload>>, ToStringTreeCodec<Headers>, ToSuccessCodec<Success>, ToJsonCodec<Error extends readonly Schema.Constraint[] ? Error[number] : Error>, never, never>`
- **Import guidance:** Start from `import { HttpApiEndpoint } from "effect/unstable/httpapi"` and use `HttpApiEndpoint.patch`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a `PATCH` endpoint declaration. Call `HttpApiEndpoint.patch` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiEndpoint.delete`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:1344`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `DELETE` endpoint declaration.
- **Signature hint:** `declare const _delete: { <const Identifier extends string, const Path extends HttpRouter.PathInput, Params extends Schema.Top | Schema.Struct.Fields = never, Query extends Schema.Top | Schema.Struct.Fields = never, Payload extends Schema.Top | readonly Schema.Top[] = never, Headers extends Schema.Top | Schema.Struct.Fields = never, const Success extends SuccessConstraint = HttpApiSchema.NoContent, const Error extends Schema.Top | ReadonlyArray<Schema.Top> = never>(identifier: Identifier, path: Path, options?: { readonly disableCodecs?: false | undefined; readonly params?: Params | undefined; readonly query?: Query | undefined; readonly headers?: Headers | undefined; readonly payload?: Payload | undefined; readonly success?: Success | undefined; readonly error?: (Error & ErrorNoStream<Types.NoInfer<Error>>) | undefined; } | undefined): HttpApiEndpoint<Identifier, 'DELETE', Path, ToStringTreeCodec<Params>, ToStringTreeCodec<Query>, ToJsonCodec<ToSchema<Payload>>, ToStringTreeCodec<Headers>, ToSuccessCodec<Success>, ToJsonCodec<Error extends readonly Schema.Constraint[] ? Error[number] : Error>, never, never>; } export { _delete as delete }`
- **Import guidance:** Start from `import { HttpApiEndpoint } from "effect/unstable/httpapi"` and use `HttpApiEndpoint.delete`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a `DELETE` endpoint declaration. Call `HttpApiEndpoint.delete` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiEndpoint.head`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:1353`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `HEAD` endpoint declaration.
- **Signature hint:** `declare function head<const Identifier extends string, const Path extends HttpRouter.PathInput, Params extends Schema.Top | Schema.Struct.Fields = never, Query extends Schema.Top | Schema.Struct.Fields = never, Payload extends Record<string, Schema.Top> = never, Headers extends Schema.Top | Schema.Struct.Fields = never, const Success extends SuccessConstraint = HttpApiSchema.NoContent, const Error extends Schema.Top | ReadonlyArray<Schema.Top> = never>(identifier: Identifier, path: Path, options?: { readonly disableCodecs?: false | undefined; readonly params?: Params | undefined; readonly query?: Query | undefined; readonly headers?: Headers | undefined; readonly payload?: Payload | undefined; readonly success?: Success | undefined; readonly error?: (Error & ErrorNoStream<Types.NoInfer<Error>>) | undefined; } | undefined): HttpApiEndpoint<Identifier, 'HEAD', Path, ToStringTreeCodec<Params>, ToStringTreeCodec<Query>, ToStringTreeCodec<ToSchema<Payload>>, ToStringTreeCodec<Headers>, ToSuccessCodec<Success>, ToJsonCodec<Error extends readonly Schema.Constraint[] ? Error[number] : Error>, never, never>`
- **Import guidance:** Start from `import { HttpApiEndpoint } from "effect/unstable/httpapi"` and use `HttpApiEndpoint.head`.
- **Suggested snippet:** Create a small representative input, call `HttpApiEndpoint.head`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiEndpoint.options`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:1361`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an `OPTIONS` endpoint declaration.
- **Signature hint:** `declare function options<const Identifier extends string, const Path extends HttpRouter.PathInput, Params extends Schema.Top | Schema.Struct.Fields = never, Query extends Schema.Top | Schema.Struct.Fields = never, Payload extends Record<string, Schema.Top> = never, Headers extends Schema.Top | Schema.Struct.Fields = never, const Success extends SuccessConstraint = HttpApiSchema.NoContent, const Error extends Schema.Top | ReadonlyArray<Schema.Top> = never>(identifier: Identifier, path: Path, options?: { readonly disableCodecs?: false | undefined; readonly params?: Params | undefined; readonly query?: Query | undefined; readonly headers?: Headers | undefined; readonly payload?: Payload | undefined; readonly success?: Success | undefined; readonly error?: (Error & ErrorNoStream<Types.NoInfer<Error>>) | undefined; } | undefined): HttpApiEndpoint<Identifier, 'OPTIONS', Path, ToStringTreeCodec<Params>, ToStringTreeCodec<Query>, ToStringTreeCodec<ToSchema<Payload>>, ToStringTreeCodec<Headers>, ToSuccessCodec<Success>, ToJsonCodec<Error extends readonly Schema.Constraint[] ? Error[number] : Error>, never, never>`
- **Import guidance:** Start from `import { HttpApiEndpoint } from "effect/unstable/httpapi"` and use `HttpApiEndpoint.options`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates an `OPTIONS` endpoint declaration. Call `HttpApiEndpoint.options` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/httpapi/HttpApiEndpoint.ParamsConstraint`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:875`
- **Kind / category:** `root-declaration` / `constraints`
- **Priority:** **optional**
- **Current description:** Constraint for path parameter schemas: each parameter must encode to `string | undefined`, or the schema must encode to a record of those values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.ParamsConstraint`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.HeadersConstraint`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:886`
- **Kind / category:** `root-declaration` / `constraints`
- **Priority:** **optional**
- **Current description:** Constraint for header schemas: each header must encode to `string | undefined`, or the schema must encode to a record of those values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.HeadersConstraint`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.QueryConstraint`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:897`
- **Kind / category:** `root-declaration` / `constraints`
- **Priority:** **optional**
- **Current description:** Constraint for query schemas: each field must encode to `string`, an array of strings, or `undefined`, or the schema must encode to a record of those values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.QueryConstraint`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.PayloadConstraint`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:912`
- **Kind / category:** `root-declaration` / `constraints`
- **Priority:** **optional**
- **Current description:** Payload schema depends on the HTTP method: - for no-body methods, payload is modeled as query params, so each field must encode to `string | ReadonlyArray<string> | undefined` and OpenAPI can expand it into `in: query` parameters - for body methods, payload may be any `Schema.Top` (or content-type keyed schemas) and OpenAPI uses `requestBody` instead of `parameters`
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.PayloadConstraint`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.SuccessConstraint`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:937`
- **Kind / category:** `root-declaration` / `constraints`
- **Priority:** **optional**
- **Current description:** Constraint for success response schemas, allowing either a single schema or a readonly array of schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.SuccessConstraint`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.ErrorConstraint`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:946`
- **Kind / category:** `root-declaration` / `constraints`
- **Priority:** **optional**
- **Current description:** Constraint for error response schemas, allowing either a single schema or a readonly array of schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.ErrorConstraint`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.PayloadConstraintCodecs`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:926`
- **Kind / category:** `root-declaration` / `constraints`
- **Priority:** **optional**
- **Current description:** Payload constraint used when automatic codecs are enabled: no-body methods accept field records for query-style encoding, while body methods accept one or more schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.PayloadConstraintCodecs`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.PayloadMap`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:128`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Maps normalized media types to a payload encoding strategy and one or more schemas. Each schema retains its declared content type in its encoding annotation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.PayloadMap`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.HttpApiEndpoint`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:140`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents an API endpoint. An API endpoint is mapped to a single route on the underlying `HttpRouter`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.HttpApiEndpoint`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.HttpApiEndpoint.prefix`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:181`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Add a prefix to the path of the endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiEndpoint.HttpApiEndpoint.prefix` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.HttpApiEndpoint.middleware`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:200`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Add an `HttpApiMiddleware` to the endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiEndpoint.HttpApiEndpoint.middleware` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.HttpApiEndpoint.annotate`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:217`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Add an annotation on the endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiEndpoint.HttpApiEndpoint.annotate` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.HttpApiEndpoint.annotateMerge`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:237`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Merge the annotations of the endpoint with the provided context.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiEndpoint.HttpApiEndpoint.annotateMerge` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.Constraint`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:288`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A widened `HttpApiEndpoint` type used when the concrete method, path, schemas, and middleware types are not needed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.Constraint`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.ConstraintRequest`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:303`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A widened endpoint type that preserves request and middleware pipeline phantom fields.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.ConstraintRequest`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.Top`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:318`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A widened endpoint type that preserves concrete runtime properties such as method, path, schemas, annotations, and middleware sets.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.Top`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.Identifier`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:340`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the endpoint identifier literal from an `HttpApiEndpoint`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.Identifier`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.Success`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:348`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the success schema associated with an endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.Success`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.Error`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:356`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the error schema associated with an endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.Error`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.Params`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:364`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the schema used for an endpoint's path parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.Params`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.Query`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:373`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the schema used for an endpoint's query parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.Query`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.Payload`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:382`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the schema used for an endpoint's request payload.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.Payload`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.Headers`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:391`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the schema used for an endpoint's request headers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.Headers`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.Middleware`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:400`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the middleware identifiers attached to an endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.Middleware`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.MiddlewareProvides`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:409`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes the services provided by the middleware attached to an endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.MiddlewareProvides`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.MiddlewareClient`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:417`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes the client-side middleware services required by an endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.MiddlewareClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.MiddlewareError`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:426`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes the error types that can be produced by the middleware attached to an endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.MiddlewareError`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.Errors`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:435`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes the full error value union for an endpoint, including the endpoint error schema's type and errors introduced by middleware.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.Errors`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.ErrorServicesEncode`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:446`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes the services required to encode an endpoint's error responses, including services required by middleware error encoders.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.ErrorServicesEncode`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.Request`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:459`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Builds the decoded request shape passed to a normal endpoint handler, including available params, query, payload, headers, the raw request, endpoint, and group. Multipart stream payloads are exposed as streams of parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.Request`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.RequestRaw`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:470`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Builds the request shape passed to a raw endpoint handler, including decoded params, query, and headers plus the raw request, endpoint, and group, while leaving payload handling to the raw request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.RequestRaw`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.ClientRequest`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:481`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Builds the request object accepted by a generated client method, including only the params, query, headers, payload, and response mode fields required by the endpoint. Multipart payloads are supplied as `FormData`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.ClientRequest`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.ClientResponseMode`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:508`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Controls what a generated client method returns: the decoded success value, the decoded value paired with the raw response, or only the raw response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.ClientResponseMode`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.ServerServices`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:517`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes the services required on the server to decode endpoint inputs and encode endpoint success, error, and middleware error responses.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.ServerServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.ClientServices`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:534`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes the services required on the client to encode endpoint requests and decode endpoint success or error responses.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.ClientServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.MiddlewareServices`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:549`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the additional services required by middleware applied to an endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.MiddlewareServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.ErrorServicesDecode`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:559`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes the services required to decode an endpoint's error responses, including services required by middleware error decoders.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.ErrorServicesDecode`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.Handler`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:571`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The normal server handler for an endpoint, accepting the decoded request shape and returning either the endpoint success value or a custom `HttpServerResponse`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.Handler`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.HandlerRaw`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:582`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The raw server handler for an endpoint, receiving a request shape without a decoded payload so the handler can read the raw `HttpServerRequest` directly.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.HandlerRaw`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.WithIdentifier`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:592`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Selects the endpoint with the specified identifier from a union of endpoints.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.WithIdentifier`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.ExcludeIdentifier`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:603`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Removes endpoints with the specified identifier from a union of endpoints.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.ExcludeIdentifier`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.HandlerWithIdentifier`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:615`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Derives the normal handler type for the endpoint with the specified identifier in an endpoint union.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.HandlerWithIdentifier`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.HandlerRawWithIdentifier`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:628`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Derives the raw handler type for the endpoint with the specified identifier in an endpoint union.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.HandlerRawWithIdentifier`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.SuccessWithIdentifier`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:641`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the decoded success value type for the endpoint with the specified identifier in an endpoint union.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.SuccessWithIdentifier`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.ErrorsWithIdentifier`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:652`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes the full error value union for the endpoint with the specified identifier in an endpoint union.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.ErrorsWithIdentifier`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.ServerServicesWithIdentifier`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:663`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes the server-side service requirements for the endpoint with the specified identifier in an endpoint union.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.ServerServicesWithIdentifier`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.MiddlewareWithIdentifier`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:674`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the middleware identifiers for the endpoint with the specified identifier in an endpoint union.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.MiddlewareWithIdentifier`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.MiddlewareServicesWithIdentifier`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:685`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the middleware service requirements for the endpoint with the specified identifier in an endpoint union.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.MiddlewareServicesWithIdentifier`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.ExcludeProvidedWithIdentifier`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:695`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Removes services provided by the HTTP router and the selected endpoint's middleware from a service requirement union.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.ExcludeProvidedWithIdentifier`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.ExcludeProvided`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:707`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Removes services provided by the HTTP router and endpoint middleware from a service requirement union.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.ExcludeProvided`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.AddPrefix`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:720`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Returns an endpoint type with the supplied path prefix prepended while preserving the endpoint's schemas, method, errors, and middleware.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.AddPrefix`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiEndpoint.AddMiddleware`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts:754`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Returns an endpoint type with additional middleware applied and the endpoint's middleware service requirements updated accordingly.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiEndpoint.AddMiddleware`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
