# Example Suggestions: `effect/unstable/http/Headers`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/Headers.ts`
- **Uncovered API records:** 20
- **Priorities:** 0 required, 9 recommended, 8 optional, 3 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                  | Line | Kind               | Priority        |
| ---------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/http/Headers.HeadersSchema (value)` |  130 | `root-declaration` | **recommended** |
| `effect/unstable/http/Headers.has`                   |  231 | `root-declaration` | **recommended** |
| `effect/unstable/http/Headers.get`                   |  249 | `root-declaration` | **recommended** |
| `effect/unstable/http/Headers.set`                   |  267 | `root-declaration` | **recommended** |
| `effect/unstable/http/Headers.setAll`                |  289 | `root-declaration` | **recommended** |
| `effect/unstable/http/Headers.merge`                 |  311 | `root-declaration` | **recommended** |
| `effect/unstable/http/Headers.remove`                |  333 | `root-declaration` | **recommended** |
| `effect/unstable/http/Headers.removeMany`            |  355 | `root-declaration` | **recommended** |
| `effect/unstable/http/Headers.redact`                |  379 | `root-declaration` | **recommended** |
| `effect/unstable/http/Headers.HeadersSchema (type)`  |  118 | `root-declaration` | **optional**    |
| `effect/unstable/http/Headers.isHeaders`             |   48 | `root-declaration` | **optional**    |
| `effect/unstable/http/Headers.empty`                 |  175 | `root-declaration` | **optional**    |
| `effect/unstable/http/Headers.fromInput`             |  187 | `root-declaration` | **optional**    |
| `effect/unstable/http/Headers.CurrentRedactedNames`  |  429 | `root-declaration` | **optional**    |
| `effect/unstable/http/Headers.Headers`               |   60 | `root-declaration` | **optional**    |
| `effect/unstable/http/Headers.Equivalence`           |  110 | `root-declaration` | **optional**    |
| `effect/unstable/http/Headers.Input`                 |  165 | `root-declaration` | **optional**    |
| `effect/unstable/http/Headers.fromRecordUnsafe`      |  218 | `root-declaration` | **discouraged** |
| `effect/unstable/http/Headers.TypeId (value)`        |   32 | `root-declaration` | **discouraged** |
| `effect/unstable/http/Headers.TypeId (type)`         |   40 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/http/Headers.HeadersSchema (value)`

- **Source:** `packages/effect/src/unstable/http/Headers.ts:130`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for `Headers` values encoded as records of string header values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Headers } from "effect/unstable/http"` and use `Headers.HeadersSchema`.
- **Suggested snippet:** Create a small representative input, call `Headers.HeadersSchema`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Headers.has`

- **Source:** `packages/effect/src/unstable/http/Headers.ts:231`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a header with the given name is present.
- **Signature hint:** `declare function has(key: string): (self: Headers) => boolean declare function has(self: Headers, key: string): boolean`
- **Import guidance:** Start from `import { Headers } from "effect/unstable/http"` and use `Headers.has`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns `true` when a header with the given name is present. Call `Headers.has` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Headers.get`

- **Source:** `packages/effect/src/unstable/http/Headers.ts:249`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Gets a header value by name safely.
- **Signature hint:** `declare function get(key: string): (self: Headers) => Option.Option<string> declare function get(self: Headers, key: string): Option.Option<string>`
- **Import guidance:** Start from `import { Headers } from "effect/unstable/http"` and use `Headers.get`.
- **Suggested snippet:** Call `Headers.get` with one input producing a present value and one producing absence, and assert the returned values with `Option.some` and `Option.none()`.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Headers.set`

- **Source:** `packages/effect/src/unstable/http/Headers.ts:267`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Returns a new `Headers` collection with the given header set.
- **Signature hint:** `declare function set(key: string, value: string): (self: Headers) => Headers declare function set(self: Headers, key: string, value: string): Headers`
- **Import guidance:** Start from `import { Headers } from "effect/unstable/http"` and use `Headers.set`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a new `Headers` collection with the given header set. Call `Headers.set` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Headers.setAll`

- **Source:** `packages/effect/src/unstable/http/Headers.ts:289`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Returns a new `Headers` collection with all provided headers set.
- **Signature hint:** `declare function setAll(headers: Input): (self: Headers) => Headers declare function setAll(self: Headers, headers: Input): Headers`
- **Import guidance:** Start from `import { Headers } from "effect/unstable/http"` and use `Headers.setAll`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a new `Headers` collection with all provided headers set. Call `Headers.setAll` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Headers.merge`

- **Source:** `packages/effect/src/unstable/http/Headers.ts:311`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Returns a new `Headers` collection containing headers from both collections.
- **Signature hint:** `declare function merge(headers: Headers): (self: Headers) => Headers declare function merge(self: Headers, headers: Headers): Headers`
- **Import guidance:** Start from `import { Headers } from "effect/unstable/http"` and use `Headers.merge`.
- **Suggested snippet:** Apply `Headers.merge` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Headers.remove`

- **Source:** `packages/effect/src/unstable/http/Headers.ts:333`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Returns a new `Headers` collection with the named header removed.
- **Signature hint:** `declare function remove(key: string): (self: Headers) => Headers declare function remove(self: Headers, key: string): Headers`
- **Import guidance:** Start from `import { Headers } from "effect/unstable/http"` and use `Headers.remove`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a new `Headers` collection with the named header removed. Call `Headers.remove` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Headers.removeMany`

- **Source:** `packages/effect/src/unstable/http/Headers.ts:355`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Returns a new `Headers` collection with each named header removed.
- **Signature hint:** `declare function removeMany(keys: Iterable<string>): (self: Headers) => Headers declare function removeMany(self: Headers, keys: Iterable<string>): Headers`
- **Import guidance:** Start from `import { Headers } from "effect/unstable/http"` and use `Headers.removeMany`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a new `Headers` collection with each named header removed. Call `Headers.removeMany` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Headers.redact`

- **Source:** `packages/effect/src/unstable/http/Headers.ts:379`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Returns a plain record with selected header values wrapped in `Redacted`.
- **Signature hint:** `declare function redact(key: string | RegExp | ReadonlyArray<string | RegExp>): (self: Headers) => Record<string, string | Redacted.Redacted> declare function redact(self: Headers, key: string | RegExp | ReadonlyArray<string | RegExp>): Record<string, string | Redacted.Redacted>`
- **Import guidance:** Start from `import { Headers } from "effect/unstable/http"` and use `Headers.redact`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a plain record with selected header values wrapped in `Redacted`. Call `Headers.redact` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/Headers.HeadersSchema (type)`

- **Source:** `packages/effect/src/unstable/http/Headers.ts:118`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema interface for `Headers` values encoded as records of string header values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Headers.HeadersSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Headers.isHeaders`

- **Source:** `packages/effect/src/unstable/http/Headers.ts:48`
- **Kind / category:** `root-declaration` / `refinements`
- **Priority:** **optional**
- **Current description:** Returns `true` if the provided value is a `Headers` value.
- **Signature hint:** `declare function isHeaders(u: unknown): u is Headers`
- **Import guidance:** Start from `import { Headers } from "effect/unstable/http"` and use `Headers.isHeaders`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Headers.isHeaders` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Headers.empty`

- **Source:** `packages/effect/src/unstable/http/Headers.ts:175`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** An empty `Headers` collection.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Headers } from "effect/unstable/http"` and use `Headers.empty`.
- **Suggested snippet:** Construct one representative value with `Headers.empty`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Headers.fromInput`

- **Source:** `packages/effect/src/unstable/http/Headers.ts:187`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates `Headers` from a record or iterable of header entries.
- **Signature hint:** `declare function fromInput(input?: Input): Headers`
- **Import guidance:** Start from `import { Headers } from "effect/unstable/http"` and use `Headers.fromInput`.
- **Suggested snippet:** Convert one representative external input with `Headers.fromInput` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Headers.CurrentRedactedNames`

- **Source:** `packages/effect/src/unstable/http/Headers.ts:429`
- **Kind / category:** `root-declaration` / `fiber refs`
- **Priority:** **optional**
- **Current description:** Context reference listing header names or patterns that should be redacted when `Headers` are inspected or rendered.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Headers } from "effect/unstable/http"` and use `Headers.CurrentRedactedNames`.
- **Suggested snippet:** Consume `Headers.CurrentRedactedNames` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Headers.Headers`

- **Source:** `packages/effect/src/unstable/http/Headers.ts:60`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents an immutable HTTP header collection keyed by lowercase header name.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Headers.Headers`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Headers.Equivalence`

- **Source:** `packages/effect/src/unstable/http/Headers.ts:110`
- **Kind / category:** `root-declaration` / `instances`
- **Priority:** **optional**
- **Current description:** Provides an `Equivalence` instance that compares `Headers` by header names and string values.
- **Signature hint:** `declare function Equivalence(self: Headers, that: Headers): boolean`
- **Import guidance:** Start from `import { Headers } from "effect/unstable/http"` and use `Headers.Equivalence`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Provides an `Equivalence` instance that compares `Headers` by header names and string values. Call `Headers.Equivalence` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Headers.Input`

- **Source:** `packages/effect/src/unstable/http/Headers.ts:165`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Input accepted when constructing headers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Headers.Input`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/http/Headers.fromRecordUnsafe`

- **Source:** `packages/effect/src/unstable/http/Headers.ts:218`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **discouraged**
- **Current description:** Treats an existing record as `Headers` unsafely.
- **Signature hint:** `declare function fromRecordUnsafe(input: Record.ReadonlyRecord<string, string>): Headers`
- **Import guidance:** Start from `import { Headers } from "effect/unstable/http"` and use `Headers.fromRecordUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Headers.fromRecordUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/http/Headers.TypeId (value)`

- **Source:** `packages/effect/src/unstable/http/Headers.ts:32`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier for `Headers` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Headers } from "effect/unstable/http"` and use `Headers.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Headers.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/http/Headers.TypeId (type)`

- **Source:** `packages/effect/src/unstable/http/Headers.ts:40`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type of the unique symbol used to brand `Headers` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/http/Headers.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
