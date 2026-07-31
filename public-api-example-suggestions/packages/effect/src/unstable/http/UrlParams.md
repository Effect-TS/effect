# Example Suggestions: `effect/unstable/http/UrlParams`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/UrlParams.ts`
- **Uncovered API records:** 24
- **Priorities:** 0 required, 11 recommended, 13 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                      | Line | Kind               | Priority        |
| -------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/http/UrlParams.isUrlParams`             |   53 | `root-declaration` | **recommended** |
| `effect/unstable/http/UrlParams.UrlParamsSchema (value)` |  237 | `root-declaration` | **recommended** |
| `effect/unstable/http/UrlParams.getAll`                  |  280 | `root-declaration` | **recommended** |
| `effect/unstable/http/UrlParams.getFirst`                |  309 | `root-declaration` | **recommended** |
| `effect/unstable/http/UrlParams.getLast`                 |  335 | `root-declaration` | **recommended** |
| `effect/unstable/http/UrlParams.set`                     |  354 | `root-declaration` | **recommended** |
| `effect/unstable/http/UrlParams.transform`               |  375 | `root-declaration` | **recommended** |
| `effect/unstable/http/UrlParams.setAll`                  |  394 | `root-declaration` | **recommended** |
| `effect/unstable/http/UrlParams.append`                  |  417 | `root-declaration` | **recommended** |
| `effect/unstable/http/UrlParams.appendAll`               |  436 | `root-declaration` | **recommended** |
| `effect/unstable/http/UrlParams.remove`                  |  447 | `root-declaration` | **recommended** |
| `effect/unstable/http/UrlParams.UrlParamsSchema (type)`  |  225 | `root-declaration` | **optional**    |
| `effect/unstable/http/UrlParams.schemaJsonField`         |  519 | `root-declaration` | **optional**    |
| `effect/unstable/http/UrlParams.make`                    |  142 | `root-declaration` | **optional**    |
| `effect/unstable/http/UrlParams.fromInput`               |  159 | `root-declaration` | **optional**    |
| `effect/unstable/http/UrlParams.empty`                   |  268 | `root-declaration` | **optional**    |
| `effect/unstable/http/UrlParams.toString`                |  458 | `root-declaration` | **optional**    |
| `effect/unstable/http/UrlParams.toReadonlyRecord`        |  510 | `root-declaration` | **optional**    |
| `effect/unstable/http/UrlParams.schemaRecord`            |  569 | `root-declaration` | **optional**    |
| `effect/unstable/http/UrlParams.UrlParams`               |   42 | `root-declaration` | **optional**    |
| `effect/unstable/http/UrlParams.Input`                   |   66 | `root-declaration` | **optional**    |
| `effect/unstable/http/UrlParams.Coercible`               |   86 | `root-declaration` | **optional**    |
| `effect/unstable/http/UrlParams.CoercibleRecord`         |  108 | `root-declaration` | **optional**    |
| `effect/unstable/http/UrlParams.Equivalence`             |  211 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/http/UrlParams.isUrlParams`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:53`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is a `UrlParams` instance.
- **Signature hint:** `declare function isUrlParams(u: unknown): u is UrlParams`
- **Import guidance:** Start from `import { UrlParams } from "effect/unstable/http"` and use `UrlParams.isUrlParams`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `UrlParams.isUrlParams` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/UrlParams.UrlParamsSchema (value)`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:237`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for `UrlParams`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { UrlParams } from "effect/unstable/http"` and use `UrlParams.UrlParamsSchema`.
- **Suggested snippet:** Use `UrlParams.UrlParamsSchema` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/UrlParams.getAll`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:280`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Returns all values for a query parameter key in insertion order.
- **Signature hint:** `declare function getAll(key: string): (self: UrlParams) => ReadonlyArray<string> declare function getAll(self: UrlParams, key: string): ReadonlyArray<string>`
- **Import guidance:** Start from `import { UrlParams } from "effect/unstable/http"` and use `UrlParams.getAll`.
- **Suggested snippet:** Create a small representative input, call `UrlParams.getAll`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/UrlParams.getFirst`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:309`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Returns the first value for a query parameter key safely.
- **Signature hint:** `declare function getFirst(key: string): (self: UrlParams) => Option.Option<string> declare function getFirst(self: UrlParams, key: string): Option.Option<string>`
- **Import guidance:** Start from `import { UrlParams } from "effect/unstable/http"` and use `UrlParams.getFirst`.
- **Suggested snippet:** Call `UrlParams.getFirst` with one input producing a present value and one producing absence, and assert the returned values with `Option.some` and `Option.none()`.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/UrlParams.getLast`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:335`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Returns the last value for a query parameter key safely.
- **Signature hint:** `declare function getLast(key: string): (self: UrlParams) => Option.Option<string> declare function getLast(self: UrlParams, key: string): Option.Option<string>`
- **Import guidance:** Start from `import { UrlParams } from "effect/unstable/http"` and use `UrlParams.getLast`.
- **Suggested snippet:** Call `UrlParams.getLast` with one input producing a present value and one producing absence, and assert the returned values with `Option.some` and `Option.none()`.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/UrlParams.set`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:354`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Sets a query parameter to a single value.
- **Signature hint:** `declare function set(key: string, value: Coercible): (self: UrlParams) => UrlParams declare function set(self: UrlParams, key: string, value: Coercible): UrlParams`
- **Import guidance:** Start from `import { UrlParams } from "effect/unstable/http"` and use `UrlParams.set`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets a query parameter to a single value. Call `UrlParams.set` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/UrlParams.transform`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:375`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Transforms the underlying ordered key-value pairs of `UrlParams`.
- **Signature hint:** `declare function transform(f: (params: UrlParams['params']) => UrlParams['params']): (self: UrlParams) => UrlParams declare function transform(self: UrlParams, f: (params: UrlParams['params']) => UrlParams['params']): UrlParams`
- **Import guidance:** Start from `import { UrlParams } from "effect/unstable/http"` and use `UrlParams.transform`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Transforms the underlying ordered key-value pairs of `UrlParams`. Call `UrlParams.transform` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/UrlParams.setAll`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:394`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Sets multiple query parameters from input.
- **Signature hint:** `declare function setAll(input: Input): (self: UrlParams) => UrlParams declare function setAll(self: UrlParams, input: Input): UrlParams`
- **Import guidance:** Start from `import { UrlParams } from "effect/unstable/http"` and use `UrlParams.setAll`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets multiple query parameters from input. Call `UrlParams.setAll` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/UrlParams.append`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:417`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Appends a query parameter value without removing existing values for the key.
- **Signature hint:** `declare function append(key: string, value: Coercible): (self: UrlParams) => UrlParams declare function append(self: UrlParams, key: string, value: Coercible): UrlParams`
- **Import guidance:** Start from `import { UrlParams } from "effect/unstable/http"` and use `UrlParams.append`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Appends a query parameter value without removing existing values for the key. Call `UrlParams.append` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/UrlParams.appendAll`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:436`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Appends all query parameters produced from the supplied input.
- **Signature hint:** `declare function appendAll(input: Input): (self: UrlParams) => UrlParams declare function appendAll(self: UrlParams, input: Input): UrlParams`
- **Import guidance:** Start from `import { UrlParams } from "effect/unstable/http"` and use `UrlParams.appendAll`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Appends all query parameters produced from the supplied input. Call `UrlParams.appendAll` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/UrlParams.remove`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:447`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Removes all query parameter values for the specified key.
- **Signature hint:** `declare function remove(key: string): (self: UrlParams) => UrlParams declare function remove(self: UrlParams, key: string): UrlParams`
- **Import guidance:** Start from `import { UrlParams } from "effect/unstable/http"` and use `UrlParams.remove`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Removes all query parameter values for the specified key. Call `UrlParams.remove` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/UrlParams.UrlParamsSchema (type)`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:225`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema type for `UrlParams`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/UrlParams.UrlParamsSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/UrlParams.schemaJsonField`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:519`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema type for decoding one URL parameter field as JSON.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/UrlParams.schemaJsonField`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/UrlParams.make`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:142`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates `UrlParams` from ordered string key-value pairs.
- **Signature hint:** `declare function make(params: ReadonlyArray<readonly [string, string]>): UrlParams`
- **Import guidance:** Start from `import { UrlParams } from "effect/unstable/http"` and use `UrlParams.make`.
- **Suggested snippet:** Construct one representative value with `UrlParams.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/UrlParams.fromInput`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:159`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates `UrlParams` from a supported input shape.
- **Signature hint:** `declare function fromInput(input: Input): UrlParams`
- **Import guidance:** Start from `import { UrlParams } from "effect/unstable/http"` and use `UrlParams.fromInput`.
- **Suggested snippet:** Convert one representative external input with `UrlParams.fromInput` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/UrlParams.empty`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:268`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** An empty `UrlParams` value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { UrlParams } from "effect/unstable/http"` and use `UrlParams.empty`.
- **Suggested snippet:** Construct one representative value with `UrlParams.empty`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/UrlParams.toString`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:458`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Serializes `UrlParams` to a URL query string without a leading question mark.
- **Signature hint:** `declare function toString(input: Input): string`
- **Import guidance:** Start from `import { UrlParams } from "effect/unstable/http"` and use `UrlParams.toString`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `UrlParams.toString`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/UrlParams.toReadonlyRecord`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:510`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Builds a readonly record from `UrlParams`.
- **Signature hint:** `declare function toReadonlyRecord(self: UrlParams): ReadonlyRecord<string, string | Arr.NonEmptyReadonlyArray<string>>`
- **Import guidance:** Start from `import { UrlParams } from "effect/unstable/http"` and use `UrlParams.toReadonlyRecord`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `UrlParams.toReadonlyRecord`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/UrlParams.schemaRecord`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:569`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Extract a record of key-value pairs from the `UrlParams`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/UrlParams.schemaRecord`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/UrlParams.UrlParams`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:42`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Immutable collection of URL query parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/UrlParams.UrlParams`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/UrlParams.Input`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:66`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Input accepted when constructing `UrlParams`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/UrlParams.Input`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/UrlParams.Coercible`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:86`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Primitive value that can be converted into a URL parameter string.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/UrlParams.Coercible`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/UrlParams.CoercibleRecord`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:108`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Record input whose fields can be coerced into URL parameter values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/UrlParams.CoercibleRecord`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/UrlParams.Equivalence`

- **Source:** `packages/effect/src/unstable/http/UrlParams.ts:211`
- **Kind / category:** `root-declaration` / `instances`
- **Priority:** **optional**
- **Current description:** Provides an order-sensitive `Equivalence` instance for `UrlParams`.
- **Signature hint:** `declare function Equivalence(self: UrlParams, that: UrlParams): boolean`
- **Import guidance:** Start from `import { UrlParams } from "effect/unstable/http"` and use `UrlParams.Equivalence`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Provides an order-sensitive `Equivalence` instance for `UrlParams`. Call `UrlParams.Equivalence` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
