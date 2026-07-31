# Example Suggestions: `effect/unstable/http/HttpBody`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/HttpBody.ts`
- **Uncovered API records:** 28
- **Priorities:** 0 required, 6 recommended, 20 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                               | Line | Kind                    | Priority        |
| ----------------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/http/HttpBody.HttpBodyError`                     |   96 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpBody.json`                              |  304 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpBody.jsonSchema`                        |  320 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpBody.stream`                            |  481 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpBody.file`                              |  497 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpBody.fileFromInfo`                      |  527 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpBody.isHttpBody`                        |   36 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpBody.ErrorReason`                       |  118 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpBody.raw`                               |  207 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpBody.uint8Array`                        |  263 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpBody.text`                              |  278 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpBody.urlParams`                         |  338 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpBody.formData`                          |  378 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpBody.formDataRecord`                    |  425 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpBody.HttpBody (type) (type)`            |   48 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpBody.HttpBody (type) (type)`            |   55 | `namespace`             | **optional**    |
| `effect/unstable/http/HttpBody.HttpBody.Proto`                    |   66 | `namespace-declaration` | **optional**    |
| `effect/unstable/http/HttpBody.HttpBody.FileLike`                 |   79 | `namespace-declaration` | **optional**    |
| `effect/unstable/http/HttpBody.Empty`                             |  146 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpBody.empty`                             |  166 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpBody.Raw`                               |  174 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpBody.Uint8Array`                        |  225 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpBody.FormData`                          |  351 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpBody.FormDataInput`                     |  390 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpBody.FormDataCoercible`                 |  402 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpBody.Stream`                            |  445 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpBody.jsonUnsafe`                        |  291 | `root-declaration`      | **discouraged** |
| `effect/unstable/http/HttpBody.HttpBodyError.HttpBodyErrorTypeId` |  105 | `member`                | **discouraged** |

## Recommended

### `effect/unstable/http/HttpBody.HttpBodyError`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:96`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error produced while constructing an HTTP body from JSON or schema-encoded input.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpBody } from "effect/unstable/http"` and use `HttpBody.HttpBodyError`.
- **Suggested snippet:** Create or capture `HttpBody.HttpBodyError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpBody.json`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:304`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a JSON HTTP body in an `Effect`.
- **Signature hint:** `declare function json(body: unknown, contentType?: string): Effect.Effect<Uint8Array, HttpBodyError>`
- **Import guidance:** Start from `import { HttpBody } from "effect/unstable/http"` and use `HttpBody.json`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpBody.json`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpBody.jsonSchema`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:320`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a JSON body constructor that first encodes values with the schema's JSON codec.
- **Signature hint:** `declare function jsonSchema<S extends Schema.Constraint>(schema: S, options?: ParseOptions | undefined): (body: S['Type'], contentType?: string) => Effect.Effect<Uint8Array, HttpBodyError, S['EncodingServices']>`
- **Import guidance:** Start from `import { HttpBody } from "effect/unstable/http"` and use `HttpBody.jsonSchema`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpBody.jsonSchema`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpBody.stream`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:481`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a streaming HTTP body from a stream of byte chunks.
- **Signature hint:** `declare function stream(body: Stream_.Stream<globalThis.Uint8Array, unknown>, contentType?: string, contentLength?: number): Stream`
- **Import guidance:** Start from `import { HttpBody } from "effect/unstable/http"` and use `HttpBody.stream`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a streaming HTTP body from a stream of byte chunks. Call `HttpBody.stream` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpBody.file`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:497`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a streaming HTTP body for a file path.
- **Signature hint:** `declare function file(path: string, options?: { readonly bytesToRead?: FileSystem.SizeInput | undefined; readonly chunkSize?: FileSystem.SizeInput | undefined; readonly offset?: FileSystem.SizeInput | undefined; readonly contentType?: string | undefined; }): Effect.Effect<Stream, PlatformError.PlatformError, FileSystem.FileSystem>`
- **Import guidance:** Start from `import { HttpBody } from "effect/unstable/http"` and use `HttpBody.file`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpBody.file`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpBody.fileFromInfo`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:527`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a streaming HTTP body for a file path using already-known file information.
- **Signature hint:** `declare function fileFromInfo(path: string, info: FileSystem.File.Info, options?: { readonly bytesToRead?: FileSystem.SizeInput | undefined; readonly chunkSize?: FileSystem.SizeInput | undefined; readonly offset?: FileSystem.SizeInput | undefined; readonly contentType?: string | undefined; }): Effect.Effect<Stream, PlatformError.PlatformError, FileSystem.FileSystem>`
- **Import guidance:** Start from `import { HttpBody } from "effect/unstable/http"` and use `HttpBody.fileFromInfo`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpBody.fileFromInfo`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/HttpBody.isHttpBody`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:36`
- **Kind / category:** `root-declaration` / `refinements`
- **Priority:** **optional**
- **Current description:** Returns `true` if the provided value is an `HttpBody`.
- **Signature hint:** `declare function isHttpBody(u: unknown): u is HttpBody`
- **Import guidance:** Start from `import { HttpBody } from "effect/unstable/http"` and use `HttpBody.isHttpBody`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `HttpBody.isHttpBody` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpBody.ErrorReason`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:118`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **optional**
- **Current description:** Reason for an `HttpBodyError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpBody.ErrorReason`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpBody.raw`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:207`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a raw HTTP body from an arbitrary value and optional `contentType` and `contentLength` metadata.
- **Signature hint:** `declare function raw(body: unknown, options?: { readonly contentType?: string | undefined; readonly contentLength?: number | undefined; } | undefined): Raw`
- **Import guidance:** Start from `import { HttpBody } from "effect/unstable/http"` and use `HttpBody.raw`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a raw HTTP body from an arbitrary value and optional `contentType` and `contentLength` metadata. Call `HttpBody.raw` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpBody.uint8Array`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:263`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a byte-array HTTP body.
- **Signature hint:** `declare function uint8Array(body: globalThis.Uint8Array, contentType?: string): Uint8Array`
- **Import guidance:** Start from `import { HttpBody } from "effect/unstable/http"` and use `HttpBody.uint8Array`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a byte-array HTTP body. Call `HttpBody.uint8Array` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpBody.text`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:278`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a UTF-8 encoded text HTTP body.
- **Signature hint:** `declare function text(body: string, contentType?: string): Uint8Array`
- **Import guidance:** Start from `import { HttpBody } from "effect/unstable/http"` and use `HttpBody.text`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a UTF-8 encoded text HTTP body. Call `HttpBody.text` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpBody.urlParams`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:338`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates an `application/x-www-form-urlencoded` HTTP body from `UrlParams`.
- **Signature hint:** `declare function urlParams(urlParams: UrlParams.Input, contentType?: string): Uint8Array`
- **Import guidance:** Start from `import { HttpBody } from "effect/unstable/http"` and use `HttpBody.urlParams`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates an `application/x-www-form-urlencoded` HTTP body from `UrlParams`. Call `HttpBody.urlParams` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpBody.formData`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:378`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Wraps a Web `FormData` value as an HTTP body.
- **Signature hint:** `declare function formData(body: globalThis.FormData): FormData`
- **Import guidance:** Start from `import { HttpBody } from "effect/unstable/http"` and use `HttpBody.formData`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Wraps a Web `FormData` value as an HTTP body. Call `HttpBody.formData` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpBody.formDataRecord`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:425`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a `FormData` HTTP body from a record.
- **Signature hint:** `declare function formDataRecord(entries: FormDataInput): FormData`
- **Import guidance:** Start from `import { HttpBody } from "effect/unstable/http"` and use `HttpBody.formDataRecord`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a `FormData` HTTP body from a record. Call `HttpBody.formDataRecord` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpBody.HttpBody (type) (type)`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:48`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents an HTTP request body.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpBody.HttpBody (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpBody.HttpBody (type) (type)`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:55`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing type-level members associated with `HttpBody`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpBody.HttpBody (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpBody.HttpBody.Proto`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:66`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Common protocol implemented by all HTTP body variants.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpBody.HttpBody.Proto`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpBody.HttpBody.FileLike`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:79`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Minimal Web `File`-like shape used by HTTP helpers that need file metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpBody.HttpBody.FileLike`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpBody.Empty`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:146`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** HTTP body variant representing the absence of request content.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpBody } from "effect/unstable/http"` and use `HttpBody.Empty`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `HttpBody.Empty`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpBody.empty`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:166`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **optional**
- **Current description:** Provides the singleton empty HTTP body.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpBody } from "effect/unstable/http"` and use `HttpBody.empty`.
- **Suggested snippet:** Construct one representative value with `HttpBody.empty`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpBody.Raw`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:174`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** HTTP body variant containing an arbitrary runtime body value with optional content metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpBody } from "effect/unstable/http"` and use `HttpBody.Raw`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `HttpBody.Raw`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpBody.Uint8Array`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:225`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** HTTP body variant backed by a `Uint8Array`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpBody } from "effect/unstable/http"` and use `HttpBody.Uint8Array`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `HttpBody.Uint8Array`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpBody.FormData`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:351`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** HTTP body variant backed by Web `FormData`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpBody } from "effect/unstable/http"` and use `HttpBody.FormData`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `HttpBody.FormData`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpBody.FormDataInput`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:390`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Record input accepted by `formDataRecord`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpBody.FormDataInput`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpBody.FormDataCoercible`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:402`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Value that can be appended by `formDataRecord`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpBody.FormDataCoercible`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpBody.Stream`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:445`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** HTTP body variant backed by a stream of `Uint8Array` chunks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpBody } from "effect/unstable/http"` and use `HttpBody.Stream`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `HttpBody.Stream`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/http/HttpBody.jsonUnsafe`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:291`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **discouraged**
- **Current description:** Creates a JSON HTTP body using `JSON.stringify`, throwing if serialization fails.
- **Signature hint:** `declare function jsonUnsafe(body: unknown, contentType?: string): Uint8Array`
- **Import guidance:** Start from `import { HttpBody } from "effect/unstable/http"` and use `HttpBody.jsonUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `HttpBody.jsonUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/http/HttpBody.HttpBodyError.HttpBodyErrorTypeId`

- **Source:** `packages/effect/src/unstable/http/HttpBody.ts:105`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as an HTTP body error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/http/HttpBody.HttpBodyError.HttpBodyErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
