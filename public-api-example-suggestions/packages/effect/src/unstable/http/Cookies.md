# Example Suggestions: `effect/unstable/http/Cookies`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/Cookies.ts`
- **Uncovered API records:** 38
- **Priorities:** 0 required, 20 recommended, 13 optional, 5 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                           | Line | Kind               | Priority        |
| ------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/http/Cookies.CookiesSchema (value)`          |   66 | `root-declaration` | **recommended** |
| `effect/unstable/http/Cookies.isCookie`                       |  131 | `root-declaration` | **recommended** |
| `effect/unstable/http/Cookies.CookiesErrorReason`             |  172 | `root-declaration` | **recommended** |
| `effect/unstable/http/Cookies.CookiesError`                   |  192 | `root-declaration` | **recommended** |
| `effect/unstable/http/Cookies.makeCookie`                     |  457 | `root-declaration` | **recommended** |
| `effect/unstable/http/Cookies.setCookie`                      |  516 | `root-declaration` | **recommended** |
| `effect/unstable/http/Cookies.setAllCookie`                   |  535 | `root-declaration` | **recommended** |
| `effect/unstable/http/Cookies.merge`                          |  552 | `root-declaration` | **recommended** |
| `effect/unstable/http/Cookies.remove`                         |  567 | `root-declaration` | **recommended** |
| `effect/unstable/http/Cookies.get`                            |  578 | `root-declaration` | **recommended** |
| `effect/unstable/http/Cookies.getValue`                       |  597 | `root-declaration` | **recommended** |
| `effect/unstable/http/Cookies.set`                            |  615 | `root-declaration` | **recommended** |
| `effect/unstable/http/Cookies.expireCookie`                   |  674 | `root-declaration` | **recommended** |
| `effect/unstable/http/Cookies.serializeCookie`                |  791 | `root-declaration` | **recommended** |
| `effect/unstable/http/Cookies.toCookieHeader`                 |  871 | `root-declaration` | **recommended** |
| `effect/unstable/http/Cookies.toRecord`                       |  880 | `root-declaration` | **recommended** |
| `effect/unstable/http/Cookies.toSetCookieHeaders`             |  913 | `root-declaration` | **recommended** |
| `effect/unstable/http/Cookies.parseHeader`                    |  925 | `root-declaration` | **recommended** |
| `effect/unstable/http/Cookies.CookieSchema (value)`           |  147 | `root-declaration` | **recommended** |
| `effect/unstable/http/Cookies.schemaRecord`                   |  897 | `root-declaration` | **recommended** |
| `effect/unstable/http/Cookies.CookiesSchema (type)`           |   53 | `root-declaration` | **optional**    |
| `effect/unstable/http/Cookies.CookieSchema (type)`            |  139 | `root-declaration` | **optional**    |
| `effect/unstable/http/Cookies.isCookies`                      |   34 | `root-declaration` | **optional**    |
| `effect/unstable/http/Cookies.Cookie`                         |  107 | `root-declaration` | **optional**    |
| `effect/unstable/http/Cookies.fromReadonlyRecord`             |  241 | `root-declaration` | **optional**    |
| `effect/unstable/http/Cookies.fromIterable`                   |  253 | `root-declaration` | **optional**    |
| `effect/unstable/http/Cookies.fromSetCookie`                  |  267 | `root-declaration` | **optional**    |
| `effect/unstable/http/Cookies.empty`                          |  417 | `root-declaration` | **optional**    |
| `effect/unstable/http/Cookies.isEmpty`                        |  425 | `root-declaration` | **optional**    |
| `effect/unstable/http/Cookies.setAll`                         |  738 | `root-declaration` | **optional**    |
| `effect/unstable/http/Cookies.Cookies`                        |   42 | `root-declaration` | **optional**    |
| `effect/unstable/http/Cookies.CookiesError.fromReason`        |  200 | `member`           | **optional**    |
| `effect/unstable/http/Cookies.CookiesError.message`           |  216 | `member`           | **optional**    |
| `effect/unstable/http/Cookies.makeCookieUnsafe`               |  504 | `root-declaration` | **discouraged** |
| `effect/unstable/http/Cookies.setUnsafe`                      |  642 | `root-declaration` | **discouraged** |
| `effect/unstable/http/Cookies.expireCookieUnsafe`             |  704 | `root-declaration` | **discouraged** |
| `effect/unstable/http/Cookies.setAllUnsafe`                   |  770 | `root-declaration` | **discouraged** |
| `effect/unstable/http/Cookies.CookiesError.CookieErrorTypeId` |  209 | `member`           | **discouraged** |

## Recommended

### `effect/unstable/http/Cookies.CookiesSchema (value)`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:66`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for `Cookies` collections.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.CookiesSchema`.
- **Suggested snippet:** Use `Cookies.CookiesSchema` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Cookies.isCookie`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:131`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is a `Cookie`.
- **Signature hint:** `declare function isCookie(u: unknown): u is Cookie`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.isCookie`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Cookies.isCookie` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Cookies.CookiesErrorReason`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:172`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error reason describing why cookie construction failed, such as invalid name, value, domain, path, or infinite max-age.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.CookiesErrorReason`.
- **Suggested snippet:** Create or capture `Cookies.CookiesErrorReason` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Cookies.CookiesError`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:192`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error returned when a cookie name, value, domain, path, or max-age option is invalid.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.CookiesError`.
- **Suggested snippet:** Create or capture `Cookies.CookiesError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Cookies.makeCookie`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:457`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a cookie, validating the name, encoded value, domain, path, and finite `maxAge`.
- **Signature hint:** `declare function makeCookie(name: string, value: string, options?: Cookie['options'] | undefined): Result.Result<Cookie, CookiesError>`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.makeCookie`.
- **Suggested snippet:** Call `Cookies.makeCookie` with one succeeding and one failing input, and assert the returned channels with `Result.succeed` and `Result.fail` without converting expected failure into an exception.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Cookies.setCookie`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:516`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Adds a cookie to a Cookies object
- **Signature hint:** `declare function setCookie(cookie: Cookie): (self: Cookies) => Cookies declare function setCookie(self: Cookies, cookie: Cookie): Cookies`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.setCookie`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Adds a cookie to a Cookies object Call `Cookies.setCookie` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Cookies.setAllCookie`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:535`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Adds multiple cookies to a Cookies object
- **Signature hint:** `declare function setAllCookie(cookies: Iterable<Cookie>): (self: Cookies) => Cookies declare function setAllCookie(self: Cookies, cookies: Iterable<Cookie>): Cookies`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.setAllCookie`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Adds multiple cookies to a Cookies object Call `Cookies.setAllCookie` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Cookies.merge`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:552`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Combines two Cookies objects, removing duplicates from the first
- **Signature hint:** `declare function merge(that: Cookies): (self: Cookies) => Cookies declare function merge(self: Cookies, that: Cookies): Cookies`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.merge`.
- **Suggested snippet:** Apply `Cookies.merge` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Cookies.remove`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:567`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Removes a cookie by name
- **Signature hint:** `declare function remove(name: string): (self: Cookies) => Cookies declare function remove(self: Cookies, name: string): Cookies`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.remove`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Removes a cookie by name Call `Cookies.remove` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Cookies.get`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:578`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Gets a cookie from a Cookies object safely.
- **Signature hint:** `declare function get(name: string): (self: Cookies) => Option.Option<Cookie> declare function get(self: Cookies, name: string): Option.Option<Cookie>`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.get`.
- **Suggested snippet:** Call `Cookies.get` with one input producing a present value and one producing absence, and assert the returned values with `Option.some` and `Option.none()`.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Cookies.getValue`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:597`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Gets the decoded value of a cookie by name safely.
- **Signature hint:** `declare function getValue(name: string): (self: Cookies) => Option.Option<string> declare function getValue(self: Cookies, name: string): Option.Option<string>`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.getValue`.
- **Suggested snippet:** Call `Cookies.getValue` with one input producing a present value and one producing absence, and assert the returned values with `Option.some` and `Option.none()`.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Cookies.set`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:615`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Creates and adds a cookie safely by name and value.
- **Signature hint:** `declare function set(name: string, value: string, options?: Cookie['options']): (self: Cookies) => Result.Result<Cookies, CookiesError> declare function set(self: Cookies, name: string, value: string, options?: Cookie['options']): Result.Result<Cookies, CookiesError>`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.set`.
- **Suggested snippet:** Call `Cookies.set` with one succeeding and one failing input, and assert the returned channels with `Result.succeed` and `Result.fail` without converting expected failure into an exception.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Cookies.expireCookie`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:674`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Adds an expired cookie safely with an empty value, `Max-Age=0`, and an epoch `Expires` value.
- **Signature hint:** `declare function expireCookie(name: string, options?: Omit<NonNullable<Cookie['options']>, 'expires' | 'maxAge'>): (self: Cookies) => Result.Result<Cookies, CookiesError> declare function expireCookie(self: Cookies, name: string, options?: Omit<NonNullable<Cookie['options']>, 'expires' | 'maxAge'>): Result.Result<Cookies, CookiesError>`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.expireCookie`.
- **Suggested snippet:** Call `Cookies.expireCookie` with one succeeding and one failing input, and assert the returned channels with `Result.succeed` and `Result.fail` without converting expected failure into an exception.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Cookies.serializeCookie`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:791`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Serializes a cookie into a string.
- **Signature hint:** `declare function serializeCookie(self: Cookie): string`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.serializeCookie`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Serializes a cookie into a string. Call `Cookies.serializeCookie` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Cookies.toCookieHeader`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:871`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Serializes a `Cookies` object into a Cookie header.
- **Signature hint:** `declare function toCookieHeader(self: Cookies): string`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.toCookieHeader`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Cookies.toCookieHeader`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Cookies.toRecord`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:880`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Converts a `Cookies` collection to a record of decoded cookie values keyed by cookie name.
- **Signature hint:** `declare function toRecord(self: Cookies): Record<string, string>`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.toRecord`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Cookies.toRecord`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Cookies.toSetCookieHeaders`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:913`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Serializes a `Cookies` collection into an array of `Set-Cookie` header values.
- **Signature hint:** `declare function toSetCookieHeaders(self: Cookies): Array<string>`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.toSetCookieHeaders`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Cookies.toSetCookieHeaders`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Cookies.parseHeader`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:925`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **recommended**
- **Current description:** Parses a cookie header into a record of key-value pairs
- **Signature hint:** `declare function parseHeader(header: string): Record<string, string>`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.parseHeader`.
- **Suggested snippet:** Convert one representative external input with `Cookies.parseHeader` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Cookies.CookieSchema (value)`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:147`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for `Cookie` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.CookieSchema`.
- **Suggested snippet:** Use `Cookies.CookieSchema` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Cookies.schemaRecord`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:897`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for transforming `Cookies` into records of decoded string values keyed by cookie name.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.schemaRecord`.
- **Suggested snippet:** Use `Cookies.schemaRecord` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/Cookies.CookiesSchema (type)`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:53`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema interface for validating and encoding `Cookies` collections.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Cookies.CookiesSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Cookies.CookieSchema (type)`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:139`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema interface for validating `Cookie` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Cookies.CookieSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Cookies.isCookies`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:34`
- **Kind / category:** `root-declaration` / `refinements`
- **Priority:** **optional**
- **Current description:** Returns `true` when a value is a `Cookies` collection.
- **Signature hint:** `declare function isCookies(u: unknown): u is Cookies`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.isCookies`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Cookies.isCookies` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Cookies.Cookie`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:107`
- **Kind / category:** `root-declaration` / `cookies`
- **Priority:** **optional**
- **Current description:** HTTP cookie value with its decoded value, encoded value, and optional cookie attributes such as domain, path, expiration, security, and same-site settings.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Cookies.Cookie`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Cookies.fromReadonlyRecord`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:241`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a `Cookies` collection from an existing readonly record of cookies keyed by cookie name.
- **Signature hint:** `declare function fromReadonlyRecord(cookies: Record.ReadonlyRecord<string, Cookie>): Cookies`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.fromReadonlyRecord`.
- **Suggested snippet:** Convert one representative external input with `Cookies.fromReadonlyRecord` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Cookies.fromIterable`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:253`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Create a Cookies object from an Iterable
- **Signature hint:** `declare function fromIterable(cookies: Iterable<Cookie>): Cookies`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.fromIterable`.
- **Suggested snippet:** Convert one representative external input with `Cookies.fromIterable` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Cookies.fromSetCookie`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:267`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Create a Cookies object from a set of Set-Cookie headers
- **Signature hint:** `declare function fromSetCookie(headers: Iterable<string> | string): Cookies`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.fromSetCookie`.
- **Suggested snippet:** Convert one representative external input with `Cookies.fromSetCookie` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Cookies.empty`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:417`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** An empty Cookies object
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.empty`.
- **Suggested snippet:** Construct one representative value with `Cookies.empty`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Cookies.isEmpty`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:425`
- **Kind / category:** `root-declaration` / `refinements`
- **Priority:** **optional**
- **Current description:** Returns `true` when the `Cookies` collection contains no cookies.
- **Signature hint:** `declare function isEmpty(self: Cookies): boolean`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.isEmpty`.
- **Suggested snippet:** Create two values within the accepted input domain, one satisfying the documented condition and one not, call `Cookies.isEmpty`, and assert `true` and `false`. Do not claim TypeScript narrowing because the signature returns only `boolean`.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Cookies.setAll`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:738`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **optional**
- **Current description:** Creates and adds multiple cookies safely from name/value/options tuples.
- **Signature hint:** `declare function setAll(cookies: Iterable<readonly [name: string, value: string, options?: Cookie['options']]>): (self: Cookies) => Result.Result<Cookies, CookiesError> declare function setAll(self: Cookies, cookies: Iterable<readonly [name: string, value: string, options?: Cookie['options']]>): Result.Result<Cookies, CookiesError>`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.setAll`.
- **Suggested snippet:** Call `Cookies.setAll` with one succeeding and one failing input, and assert the returned channels with `Result.succeed` and `Result.fail` without converting expected failure into an exception.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Cookies.Cookies`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:42`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Immutable collection of HTTP cookies keyed by cookie name.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Cookies.Cookies`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Cookies.CookiesError.fromReason`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:200`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Creates a cookie error from a reason tag and optional cause.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/Cookies.CookiesError.fromReason` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Cookies.CookiesError.message`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:216`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Uses the concrete cookie error reason as the public message.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/Cookies.CookiesError.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/http/Cookies.makeCookieUnsafe`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:504`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **discouraged**
- **Current description:** Create a new cookie, throwing an error if invalid
- **Signature hint:** `declare function makeCookieUnsafe(name: string, value: string, options?: Cookie['options'] | undefined): Cookie`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.makeCookieUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Cookies.makeCookieUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/http/Cookies.setUnsafe`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:642`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **discouraged**
- **Current description:** Creates and adds a cookie by name and value, throwing if the cookie fields are invalid.
- **Signature hint:** `declare function setUnsafe(name: string, value: string, options?: Cookie['options']): (self: Cookies) => Cookies declare function setUnsafe(self: Cookies, name: string, value: string, options?: Cookie['options']): Cookies`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.setUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Cookies.setUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/http/Cookies.expireCookieUnsafe`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:704`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **discouraged**
- **Current description:** Adds an expired cookie to a Cookies object, throwing an error if invalid
- **Signature hint:** `declare function expireCookieUnsafe(name: string, options?: Omit<NonNullable<Cookie['options']>, 'expires' | 'maxAge'>): (self: Cookies) => Cookies declare function expireCookieUnsafe(self: Cookies, name: string, options?: Omit<NonNullable<Cookie['options']>, 'expires' | 'maxAge'>): Cookies`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.expireCookieUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Cookies.expireCookieUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/http/Cookies.setAllUnsafe`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:770`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **discouraged**
- **Current description:** Adds multiple cookies to a Cookies object, throwing an error if invalid
- **Signature hint:** `declare function setAllUnsafe(cookies: Iterable<readonly [name: string, value: string, options?: Cookie['options']]>): (self: Cookies) => Cookies declare function setAllUnsafe(self: Cookies, cookies: Iterable<readonly [name: string, value: string, options?: Cookie['options']]>): Cookies`
- **Import guidance:** Start from `import { Cookies } from "effect/unstable/http"` and use `Cookies.setAllUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Cookies.setAllUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/http/Cookies.CookiesError.CookieErrorTypeId`

- **Source:** `packages/effect/src/unstable/http/Cookies.ts:209`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a cookie validation error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/http/Cookies.CookiesError.CookieErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
