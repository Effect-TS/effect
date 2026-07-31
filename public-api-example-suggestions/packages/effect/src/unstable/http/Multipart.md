# Example Suggestions: `effect/unstable/http/Multipart`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/Multipart.ts`
- **Uncovered API records:** 35
- **Priorities:** 0 required, 11 recommended, 22 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                          | Line | Kind                    | Priority        |
| ---------------------------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/http/Multipart.toPersisted`                                 |  672 | `root-declaration`      | **recommended** |
| `effect/unstable/http/Multipart.isPart`                                      |  106 | `root-declaration`      | **recommended** |
| `effect/unstable/http/Multipart.isField`                                     |  114 | `root-declaration`      | **recommended** |
| `effect/unstable/http/Multipart.isFile`                                      |  142 | `root-declaration`      | **recommended** |
| `effect/unstable/http/Multipart.MultipartErrorReason`                        |  200 | `root-declaration`      | **recommended** |
| `effect/unstable/http/Multipart.MultipartError`                              |  226 | `root-declaration`      | **recommended** |
| `effect/unstable/http/Multipart.PersistedFileSchema (value)`                 |  297 | `root-declaration`      | **recommended** |
| `effect/unstable/http/Multipart.FilesSchema`                                 |  332 | `root-declaration`      | **recommended** |
| `effect/unstable/http/Multipart.makeConfig`                                  |  414 | `root-declaration`      | **recommended** |
| `effect/unstable/http/Multipart.collectUint8Array`                           |  642 | `root-declaration`      | **recommended** |
| `effect/unstable/http/Multipart.SingleFileSchema`                            |  345 | `root-declaration`      | **recommended** |
| `effect/unstable/http/Multipart.PersistedFileSchema (type)`                  |  277 | `root-declaration`      | **optional**    |
| `effect/unstable/http/Multipart.isPersistedFile`                             |  169 | `root-declaration`      | **optional**    |
| `effect/unstable/http/Multipart.schemaPersisted`                             |  369 | `root-declaration`      | **optional**    |
| `effect/unstable/http/Multipart.schemaJson`                                  |  385 | `root-declaration`      | **optional**    |
| `effect/unstable/http/Multipart.makeChannel`                                 |  444 | `root-declaration`      | **optional**    |
| `effect/unstable/http/Multipart.limitsServices`                              |  757 | `root-declaration`      | **optional**    |
| `effect/unstable/http/Multipart.MaxParts`                                    |  819 | `root-declaration`      | **optional**    |
| `effect/unstable/http/Multipart.MaxFieldSize`                                |  833 | `root-declaration`      | **optional**    |
| `effect/unstable/http/Multipart.MaxFileSize`                                 |  847 | `root-declaration`      | **optional**    |
| `effect/unstable/http/Multipart.FieldMimeTypes`                              |  863 | `root-declaration`      | **optional**    |
| `effect/unstable/http/Multipart.Part (type) (type)`                          |   57 | `root-declaration`      | **optional**    |
| `effect/unstable/http/Multipart.Part (type) (type)`                          |   64 | `namespace`             | **optional**    |
| `effect/unstable/http/Multipart.Part.Proto`                                  |   76 | `namespace-declaration` | **optional**    |
| `effect/unstable/http/Multipart.Field`                                       |   93 | `root-declaration`      | **optional**    |
| `effect/unstable/http/Multipart.File`                                        |  127 | `root-declaration`      | **optional**    |
| `effect/unstable/http/Multipart.PersistedFile`                               |  155 | `root-declaration`      | **optional**    |
| `effect/unstable/http/Multipart.Persisted`                                   |  183 | `root-declaration`      | **optional**    |
| `effect/unstable/http/Multipart.MultipartError.fromReason`                   |  234 | `member`                | **optional**    |
| `effect/unstable/http/Multipart.MultipartError.message`                      |  266 | `member`                | **optional**    |
| `effect/unstable/http/Multipart.withLimits`                                  |  788 | `namespace`             | **optional**    |
| `effect/unstable/http/Multipart.withLimits.Options`                          |  800 | `namespace-declaration` | **optional**    |
| `effect/unstable/http/Multipart.MultipartError.HttpServerRespondable.symbol` |  257 | `member`                | **optional**    |
| `effect/unstable/http/Multipart.TypeId`                                      |   45 | `root-declaration`      | **discouraged** |
| `effect/unstable/http/Multipart.MultipartError.MultipartErrorTypeId`         |  243 | `member`                | **discouraged** |

## Recommended

### `effect/unstable/http/Multipart.toPersisted`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:672`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Persists a stream of multipart parts into a record.
- **Signature hint:** `declare function toPersisted(stream: Stream.Stream<Part, MultipartError>, writeFile?: (path: string, file: File) => Effect.Effect<void, MultipartError, FileSystem.FileSystem>): Effect.Effect<Persisted, MultipartError, FileSystem.FileSystem | Path.Path | Scope.Scope>`
- **Import guidance:** Start from `import { Multipart } from "effect/unstable/http"` and use `Multipart.toPersisted`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Multipart.toPersisted`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Multipart.isPart`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:106`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is a multipart `Part`.
- **Signature hint:** `declare function isPart(u: unknown): u is Part`
- **Import guidance:** Start from `import { Multipart } from "effect/unstable/http"` and use `Multipart.isPart`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Multipart.isPart` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Multipart.isField`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:114`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is a multipart text `Field`.
- **Signature hint:** `declare function isField(u: unknown): u is Field`
- **Import guidance:** Start from `import { Multipart } from "effect/unstable/http"` and use `Multipart.isField`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Multipart.isField` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Multipart.isFile`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:142`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is a multipart `File`.
- **Signature hint:** `declare function isFile(u: unknown): u is File`
- **Import guidance:** Start from `import { Multipart } from "effect/unstable/http"` and use `Multipart.isFile`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Multipart.isFile` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Multipart.MultipartErrorReason`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:200`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error reason carried by a `MultipartError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Multipart } from "effect/unstable/http"` and use `Multipart.MultipartErrorReason`.
- **Suggested snippet:** Create or capture `Multipart.MultipartErrorReason` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Multipart.MultipartError`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:226`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error raised while parsing, streaming, or persisting multipart form data.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Multipart } from "effect/unstable/http"` and use `Multipart.MultipartError`.
- **Suggested snippet:** Create or capture `Multipart.MultipartError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Multipart.PersistedFileSchema (value)`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:297`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for persisted multipart files.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Multipart } from "effect/unstable/http"` and use `Multipart.PersistedFileSchema`.
- **Suggested snippet:** Use `Multipart.PersistedFileSchema` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Multipart.FilesSchema`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:332`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for an array of persisted multipart files.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Multipart } from "effect/unstable/http"` and use `Multipart.FilesSchema`.
- **Suggested snippet:** Use `Multipart.FilesSchema` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Multipart.makeConfig`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:414`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **recommended**
- **Current description:** Builds the low-level multipart parser configuration from request headers and the current fiber context.
- **Signature hint:** `declare function makeConfig(headers: Record<string, string>): Effect.Effect<MP.BaseConfig>`
- **Import guidance:** Start from `import { Multipart } from "effect/unstable/http"` and use `Multipart.makeConfig`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Multipart.makeConfig`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Multipart.collectUint8Array`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:642`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Runs a channel of byte chunks and collects all output into a single `Uint8Array`.
- **Signature hint:** `declare function collectUint8Array<OE, OD, R>(self: Channel.Channel<Arr.NonEmptyReadonlyArray<Uint8Array>, OE, OD, unknown, unknown, unknown, R>): Effect.Effect<Uint8Array<ArrayBuffer>, OE, R>`
- **Import guidance:** Start from `import { Multipart } from "effect/unstable/http"` and use `Multipart.collectUint8Array`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Multipart.collectUint8Array`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Multipart.SingleFileSchema`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:345`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for exactly one persisted multipart file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Multipart } from "effect/unstable/http"` and use `Multipart.SingleFileSchema`.
- **Suggested snippet:** Use `Multipart.SingleFileSchema` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/Multipart.PersistedFileSchema (type)`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:277`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema type for persisted multipart files.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Multipart.PersistedFileSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Multipart.isPersistedFile`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:169`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Returns `true` when a value is a persisted multipart file.
- **Signature hint:** `declare function isPersistedFile(u: unknown): u is PersistedFile`
- **Import guidance:** Start from `import { Multipart } from "effect/unstable/http"` and use `Multipart.isPersistedFile`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Multipart.isPersistedFile` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Multipart.schemaPersisted`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:369`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Creates a decoder for persisted multipart data using the supplied schema.
- **Signature hint:** `declare function schemaPersisted<A, I extends Partial<Persisted>, RD>(schema: Schema.ConstraintCodec<A, I, RD, unknown>): (input: unknown, options?: ParseOptions) => Effect.Effect<A, Schema.SchemaError, RD>`
- **Import guidance:** Start from `import { Multipart } from "effect/unstable/http"` and use `Multipart.schemaPersisted`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Multipart.schemaPersisted`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Multipart.schemaJson`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:385`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Creates a decoder for a JSON-encoded field in persisted multipart data.
- **Signature hint:** `declare function schemaJson<A, RD>(schema: Schema.ConstraintDecoder<A, RD>, options?: ParseOptions | undefined): { (field: string): (persisted: Persisted) => Effect.Effect<A, Schema.SchemaError, RD>; (persisted: Persisted, field: string): Effect.Effect<A, Schema.SchemaError, RD>; }`
- **Import guidance:** Start from `import { Multipart } from "effect/unstable/http"` and use `Multipart.schemaJson`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a decoder for a JSON-encoded field in persisted multipart data. Call `Multipart.schemaJson` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Multipart.makeChannel`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:444`
- **Kind / category:** `root-declaration` / `Parsers`
- **Priority:** **optional**
- **Current description:** Creates a channel that parses multipart byte chunks into multipart parts.
- **Signature hint:** `declare function makeChannel<IE>(headers: Record<string, string>): Channel.Channel<Arr.NonEmptyReadonlyArray<Part>, MultipartError | IE, void, Arr.NonEmptyReadonlyArray<Uint8Array>, IE, unknown>`
- **Import guidance:** Start from `import { Multipart } from "effect/unstable/http"` and use `Multipart.makeChannel`.
- **Suggested snippet:** Create a finite Channel, apply `Multipart.makeChannel`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Multipart.limitsServices`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:757`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Creates a context containing multipart parser limit settings.
- **Signature hint:** `declare function limitsServices(options: { readonly maxParts?: number | undefined; readonly maxFieldSize?: FileSystem.SizeInput | undefined; readonly maxFileSize?: FileSystem.SizeInput | undefined; readonly maxTotalSize?: FileSystem.SizeInput | undefined; readonly fieldMimeTypes?: ReadonlyArray<string> | undefined; }): Context.Context<never>`
- **Import guidance:** Start from `import { Multipart } from "effect/unstable/http"` and use `Multipart.limitsServices`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a context containing multipart parser limit settings. Call `Multipart.limitsServices` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Multipart.MaxParts`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:819`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference for the maximum number of multipart parts allowed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Multipart } from "effect/unstable/http"` and use `Multipart.MaxParts`.
- **Suggested snippet:** Consume `Multipart.MaxParts` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Multipart.MaxFieldSize`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:833`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference for the maximum size of a multipart field value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Multipart } from "effect/unstable/http"` and use `Multipart.MaxFieldSize`.
- **Suggested snippet:** Consume `Multipart.MaxFieldSize` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Multipart.MaxFileSize`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:847`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference for the maximum size of a multipart file part.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Multipart } from "effect/unstable/http"` and use `Multipart.MaxFileSize`.
- **Suggested snippet:** Consume `Multipart.MaxFileSize` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Multipart.FieldMimeTypes`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:863`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference for MIME type fragments that should be parsed as multipart fields instead of files.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Multipart } from "effect/unstable/http"` and use `Multipart.FieldMimeTypes`.
- **Suggested snippet:** Consume `Multipart.FieldMimeTypes` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Multipart.Part (type) (type)`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:57`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A parsed multipart part.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Multipart.Part (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Multipart.Part (type) (type)`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:64`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing shared multipart part model types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Multipart.Part (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Multipart.Part.Proto`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:76`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Common protocol implemented by multipart part values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Multipart.Part.Proto`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Multipart.Field`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:93`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Multipart form field containing a decoded text value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Multipart.Field`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Multipart.File`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:127`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Multipart file part.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Multipart.File`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Multipart.PersistedFile`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:155`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Multipart file part that has been written to the filesystem.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Multipart.PersistedFile`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Multipart.Persisted`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:183`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Record representation of persisted multipart data.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Multipart.Persisted`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Multipart.MultipartError.fromReason`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:234`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Creates a multipart error from a reason tag and optional cause.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/Multipart.MultipartError.fromReason` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Multipart.MultipartError.message`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:266`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Uses the concrete multipart error reason as the public message.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/Multipart.MultipartError.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Multipart.withLimits`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:788`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing multipart parser limit option types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Multipart.withLimits`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Multipart.withLimits.Options`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:800`
- **Kind / category:** `namespace-declaration` / `fiber refs`
- **Priority:** **optional**
- **Current description:** Options for overriding multipart parser limits.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Multipart.withLimits.Options`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Multipart.MultipartError.HttpServerRespondable.symbol`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:257`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Converts the multipart error into an HTTP response based on its reason.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/Multipart.MultipartError.HttpServerRespondable.symbol` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/http/Multipart.TypeId`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:45`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type identifier used to brand multipart part values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Multipart } from "effect/unstable/http"` and use `Multipart.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Multipart.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/http/Multipart.MultipartError.MultipartErrorTypeId`

- **Source:** `packages/effect/src/unstable/http/Multipart.ts:243`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a multipart error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/http/Multipart.MultipartError.MultipartErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
