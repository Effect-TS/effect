# Example Suggestions: `effect/unstable/httpapi/HttpApiSchema`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts`
- **Uncovered API records:** 34
- **Priorities:** 0 required, 15 recommended, 15 optional, 4 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                   | Line | Kind               | Priority        |
| --------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/httpapi/HttpApiSchema.status`                        |  160 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiSchema.Empty`                         |  180 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiSchema.NoContent (value)`             |  196 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiSchema.Created (value)`               |  212 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiSchema.Accepted (value)`              |  228 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiSchema.asNoContent (value)`           |  252 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiSchema.StreamSse (value)`             |  397 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiSchema.StreamUint8Array (value)`      |  439 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiSchema.asMultipart (value)`           |  502 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiSchema.asMultipartStream (value)`     |  546 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiSchema.asJson`                        |  591 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiSchema.asFormUrlEncoded`              |  607 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiSchema.asText`                        |  625 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiSchema.asUint8Array`                  |  642 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiSchema.isNoContent`                   |  659 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiSchema.asNoContent (type)`            |  236 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiSchema.asMultipart (type)`            |  492 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiSchema.asMultipartStream (type)`      |  536 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiSchema.StatusLiteral`                 |  146 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiSchema.Encoding`                      |   42 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiSchema.PayloadEncoding`               |   50 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiSchema.ResponseEncoding`              |   68 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiSchema.NoContent (type)`              |  188 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiSchema.Created (type)`                |  204 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiSchema.Accepted (type)`               |  220 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiSchema.StreamSseMode`                 |  276 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiSchema.StreamSse (type)`              |  301 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiSchema.SseEventFromData`              |  335 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiSchema.StreamUint8Array (type)`       |  364 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiSchema.StreamSchema`                  |  387 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiSchema.MultipartTypeId (value)`       |  476 | `root-declaration` | **discouraged** |
| `effect/unstable/httpapi/HttpApiSchema.MultipartTypeId (type)`        |  484 | `root-declaration` | **discouraged** |
| `effect/unstable/httpapi/HttpApiSchema.MultipartStreamTypeId (value)` |  520 | `root-declaration` | **discouraged** |
| `effect/unstable/httpapi/HttpApiSchema.MultipartStreamTypeId (type)`  |  528 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/httpapi/HttpApiSchema.status`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:160`
- **Kind / category:** `root-declaration` / `status`
- **Priority:** **recommended**
- **Current description:** Sets the HTTP status code of a schema.
- **Signature hint:** `declare function status(code: number): { <S extends Schema.Top>(self: S): S['Rebuild']; } declare function status(code: StatusLiteral): { <S extends Schema.Top>(self: S): S['Rebuild']; }`
- **Import guidance:** Start from `import { HttpApiSchema } from "effect/unstable/httpapi"` and use `HttpApiSchema.status`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets the HTTP status code of a schema. Call `HttpApiSchema.status` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiSchema.Empty`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:180`
- **Kind / category:** `root-declaration` / `Empty`
- **Priority:** **recommended**
- **Current description:** Creates a void schema with the given HTTP status code. This is used to represent empty responses with a specific status code.
- **Signature hint:** `declare function Empty(code: number): Schema.Void`
- **Import guidance:** Start from `import { HttpApiSchema } from "effect/unstable/httpapi"` and use `HttpApiSchema.Empty`.
- **Suggested snippet:** Define the smallest domain Schema involving `HttpApiSchema.Empty`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiSchema.NoContent (value)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:196`
- **Kind / category:** `root-declaration` / `Empty`
- **Priority:** **recommended**
- **Current description:** Schema for empty HTTP responses with status code 204.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiSchema } from "effect/unstable/httpapi"` and use `HttpApiSchema.NoContent`.
- **Suggested snippet:** Use `HttpApiSchema.NoContent` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiSchema.Created (value)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:212`
- **Kind / category:** `root-declaration` / `Empty`
- **Priority:** **recommended**
- **Current description:** Schema for empty HTTP responses with status code 201.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiSchema } from "effect/unstable/httpapi"` and use `HttpApiSchema.Created`.
- **Suggested snippet:** Construct one representative value with `HttpApiSchema.Created`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiSchema.Accepted (value)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:228`
- **Kind / category:** `root-declaration` / `Empty`
- **Priority:** **recommended**
- **Current description:** Schema for empty HTTP responses with status code 202.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiSchema } from "effect/unstable/httpapi"` and use `HttpApiSchema.Accepted`.
- **Suggested snippet:** Use `HttpApiSchema.Accepted` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiSchema.asNoContent (value)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:252`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Marks a schema as a no-content response while preserving a decoded client value.
- **Signature hint:** `declare function asNoContent<S extends Schema.Constraint>(options: { readonly decode: LazyArg<S['Type']>; }): (self: S) => asNoContent<S>`
- **Import guidance:** Start from `import { HttpApiSchema } from "effect/unstable/httpapi"` and use `HttpApiSchema.asNoContent`.
- **Suggested snippet:** Define the smallest domain Schema involving `HttpApiSchema.asNoContent`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiSchema.StreamSse (value)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:397`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a Server-Sent Events streaming success response schema.
- **Signature hint:** `declare function StreamSse<Events extends Sse.EventCodec, Error extends Schema.Constraint = Schema.Never>(options: { readonly contentType?: string | undefined; readonly events: Events; readonly error?: Error | undefined; }): StreamSse<Events, Error, Events['Type']>`
- **Import guidance:** Start from `import { HttpApiSchema } from "effect/unstable/httpapi"` and use `HttpApiSchema.StreamSse`.
- **Suggested snippet:** Define the smallest domain Schema involving `HttpApiSchema.StreamSse`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiSchema.StreamUint8Array (value)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:439`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a streaming `Uint8Array` success response schema.
- **Signature hint:** `declare function StreamUint8Array(options?: { readonly contentType?: string | undefined; }): StreamUint8Array`
- **Import guidance:** Start from `import { HttpApiSchema } from "effect/unstable/httpapi"` and use `HttpApiSchema.StreamUint8Array`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a streaming `Uint8Array` success response schema. Call `HttpApiSchema.StreamUint8Array` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiSchema.asMultipart (value)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:502`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Marks a schema as a multipart payload.
- **Signature hint:** `declare function asMultipart(options?: Multipart_.withLimits.Options): <S extends Schema.Top>(self: S) => asMultipart<S>`
- **Import guidance:** Start from `import { HttpApiSchema } from "effect/unstable/httpapi"` and use `HttpApiSchema.asMultipart`.
- **Suggested snippet:** Define the smallest domain Schema involving `HttpApiSchema.asMultipart`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiSchema.asMultipartStream (value)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:546`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Marks a schema as a multipart stream payload.
- **Signature hint:** `declare function asMultipartStream(options?: Multipart_.withLimits.Options): <S extends Schema.Top>(self: S) => asMultipartStream<S>`
- **Import guidance:** Start from `import { HttpApiSchema } from "effect/unstable/httpapi"` and use `HttpApiSchema.asMultipartStream`.
- **Suggested snippet:** Define the smallest domain Schema involving `HttpApiSchema.asMultipartStream`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiSchema.asJson`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:591`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Marks a schema as a JSON payload / response.
- **Signature hint:** `declare function asJson(options?: { readonly contentType?: string; }): <S extends Schema.Top>(self: S) => S['Rebuild']`
- **Import guidance:** Start from `import { HttpApiSchema } from "effect/unstable/httpapi"` and use `HttpApiSchema.asJson`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Marks a schema as a JSON payload / response. Call `HttpApiSchema.asJson` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiSchema.asFormUrlEncoded`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:607`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Marks a schema as an `application/x-www-form-urlencoded` payload or response.
- **Signature hint:** `declare function asFormUrlEncoded(options?: { readonly contentType?: string; }): <S extends Schema.Top>(self: S) => S['Rebuild']`
- **Import guidance:** Start from `import { HttpApiSchema } from "effect/unstable/httpapi"` and use `HttpApiSchema.asFormUrlEncoded`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Marks a schema as an `application/x-www-form-urlencoded` payload or response. Call `HttpApiSchema.asFormUrlEncoded` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiSchema.asText`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:625`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Marks a schema as a text payload / response.
- **Signature hint:** `declare function asText(options?: { readonly contentType?: string; }): <S extends Schema.Top & { readonly Encoded: string; }>(self: S) => S['Rebuild']`
- **Import guidance:** Start from `import { HttpApiSchema } from "effect/unstable/httpapi"` and use `HttpApiSchema.asText`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Marks a schema as a text payload / response. Call `HttpApiSchema.asText` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiSchema.asUint8Array`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:642`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Marks a schema as a binary payload / response.
- **Signature hint:** `declare function asUint8Array(options?: { readonly contentType?: string; }): <S extends Schema.Top & { readonly Encoded: Uint8Array; }>(self: S) => S['Rebuild']`
- **Import guidance:** Start from `import { HttpApiSchema } from "effect/unstable/httpapi"` and use `HttpApiSchema.asUint8Array`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Marks a schema as a binary payload / response. Call `HttpApiSchema.asUint8Array` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiSchema.isNoContent`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:659`
- **Kind / category:** `root-declaration` / `predicates`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a schema AST represents a no-content response.
- **Signature hint:** `declare function isNoContent(ast: SchemaAST.AST): boolean`
- **Import guidance:** Start from `import { HttpApiSchema } from "effect/unstable/httpapi"` and use `HttpApiSchema.isNoContent`.
- **Suggested snippet:** Create two values within the accepted input domain, one satisfying the documented condition and one not, call `HttpApiSchema.isNoContent`, and assert `true` and `false`. Do not claim TypeScript narrowing because the signature returns only `boolean`.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/httpapi/HttpApiSchema.asNoContent (type)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:236`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema type returned by `asNoContent`, encoding as `void` while decoding to the original schema type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSchema.asNoContent`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSchema.asMultipart (type)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:492`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema type returned by `asMultipart` for buffered multipart payloads.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSchema.asMultipart`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSchema.asMultipartStream (type)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:536`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema type returned by `asMultipartStream` for streaming multipart payloads.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSchema.asMultipartStream`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSchema.StatusLiteral`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:146`
- **Kind / category:** `root-declaration` / `status`
- **Priority:** **optional**
- **Current description:** Common HTTP status code literals accepted by `status`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSchema.StatusLiteral`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSchema.Encoding`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:42`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** HTTP API body encoding metadata used by payloads and responses.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSchema.Encoding`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSchema.PayloadEncoding`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:50`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** HTTP API request payload encoding metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSchema.PayloadEncoding`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSchema.ResponseEncoding`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:68`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** HTTP API response body encoding metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSchema.ResponseEncoding`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSchema.NoContent (type)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:188`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type of the `NoContent` schema, a void schema annotated with HTTP status code 204.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSchema.NoContent`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSchema.Created (type)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:204`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type of the `Created` schema, a void schema annotated with HTTP status code 201.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSchema.Created`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSchema.Accepted (type)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:220`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type of the `Accepted` schema, a void schema annotated with HTTP status code 202.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSchema.Accepted`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSchema.StreamSseMode`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:276`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Mode describing whether an SSE stream emits full events or raw data values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSchema.StreamSseMode`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSchema.StreamSse (type)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:301`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Schema for a Server-Sent Events success response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSchema.StreamSse`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSchema.SseEventFromData`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:335`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Event schema produced when `StreamSse` is constructed from a JSON data schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSchema.SseEventFromData`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSchema.StreamUint8Array (type)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:364`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Schema for a streaming `Uint8Array` success response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSchema.StreamUint8Array`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSchema.StreamSchema`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:387`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Schema for a streaming HTTP API success response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSchema.StreamSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/httpapi/HttpApiSchema.MultipartTypeId (value)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:476`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime brand key used to mark schemas as buffered multipart payloads.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiSchema } from "effect/unstable/httpapi"` and use `HttpApiSchema.MultipartTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `HttpApiSchema.MultipartTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/httpapi/HttpApiSchema.MultipartTypeId (type)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:484`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level brand identifier used by `asMultipart`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/httpapi/HttpApiSchema.MultipartTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/httpapi/HttpApiSchema.MultipartStreamTypeId (value)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:520`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime brand key used to mark schemas as streaming multipart payloads.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiSchema } from "effect/unstable/httpapi"` and use `HttpApiSchema.MultipartStreamTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `HttpApiSchema.MultipartStreamTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/httpapi/HttpApiSchema.MultipartStreamTypeId (type)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSchema.ts:528`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level brand identifier used by `asMultipartStream`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/httpapi/HttpApiSchema.MultipartStreamTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
