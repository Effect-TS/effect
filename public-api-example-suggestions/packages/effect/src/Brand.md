# Example Suggestions: `effect/Brand`

- **Package:** `effect`
- **Source:** `packages/effect/src/Brand.ts`
- **Uncovered API records:** 22
- **Priorities:** 0 required, 3 recommended, 19 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                   | Line | Kind                    | Priority        |
| ------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/Brand.BrandError`             |  106 | `root-declaration`      | **recommended** |
| `effect/Brand.make`                   |  249 | `root-declaration`      | **recommended** |
| `effect/Brand.check`                  |  274 | `root-declaration`      | **recommended** |
| `effect/Brand.nominal`                |  228 | `root-declaration`      | **optional**    |
| `effect/Brand.all`                    |  308 | `root-declaration`      | **optional**    |
| `effect/Brand.Brand (type) (type)`    |   35 | `root-declaration`      | **optional**    |
| `effect/Brand.Constructor`            |   59 | `root-declaration`      | **optional**    |
| `effect/Brand.Constructor.option`     |   69 | `member`                | **optional**    |
| `effect/Brand.Constructor.result`     |   75 | `member`                | **optional**    |
| `effect/Brand.Constructor.is`         |   80 | `member`                | **optional**    |
| `effect/Brand.BrandError._tag`        |  115 | `member`                | **optional**    |
| `effect/Brand.BrandError.name`        |  121 | `member`                | **optional**    |
| `effect/Brand.BrandError.issue`       |  127 | `member`                | **optional**    |
| `effect/Brand.BrandError.message`     |  133 | `member`                | **optional**    |
| `effect/Brand.BrandError.toString`    |  141 | `member`                | **optional**    |
| `effect/Brand.Brand (type) (type)`    |  152 | `namespace`             | **optional**    |
| `effect/Brand.Brand.FromConstructor`  |  159 | `namespace-declaration` | **optional**    |
| `effect/Brand.Brand.Unbranded`        |  167 | `namespace-declaration` | **optional**    |
| `effect/Brand.Brand.Keys`             |  175 | `namespace-declaration` | **optional**    |
| `effect/Brand.Brand.Brands`           |  183 | `namespace-declaration` | **optional**    |
| `effect/Brand.Brand.EnsureCommonBase` |  193 | `namespace-declaration` | **optional**    |
| `effect/Brand.Branded`                |  211 | `root-declaration`      | **optional**    |

## Recommended

### `effect/Brand.BrandError`

- **Source:** `packages/effect/src/Brand.ts:106`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error returned when a branded type is constructed from an invalid value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Brand } from "effect"` and use `Brand.BrandError`.
- **Suggested snippet:** Create or capture `Brand.BrandError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Brand.make`

- **Source:** `packages/effect/src/Brand.ts:249`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Returns a `Constructor` that can construct a branded type from an unbranded value using the provided `filter` predicate as validation of the input data.
- **Signature hint:** `declare function make<A extends Brand<any>>(filter: (unbranded: Brand.Unbranded<A>) => Schema.FilterOutput): Constructor<A>`
- **Import guidance:** Start from `import { Brand } from "effect"` and use `Brand.make`.
- **Suggested snippet:** Construct one representative value with `Brand.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Brand.check`

- **Source:** `packages/effect/src/Brand.ts:274`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a branded type `Constructor` from one or more schema checks.
- **Signature hint:** `declare const check: <A extends Brand<any>>(checks_0: SchemaAST.Check<Brand.Unbranded<A>>, ...checks: SchemaAST.Check<Brand.Unbranded<A>>[]) => Constructor<A>`
- **Import guidance:** Start from `import { Brand } from "effect"` and use `Brand.check`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a branded type `Constructor` from one or more schema checks. Call `Brand.check` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Brand.nominal`

- **Source:** `packages/effect/src/Brand.ts:228`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Returns a `Constructor` that **does not apply any runtime checks** and just returns the provided value.
- **Signature hint:** `declare function nominal<A extends Brand<any>>(): Constructor<A>`
- **Import guidance:** Start from `import { Brand } from "effect"` and use `Brand.nominal`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a `Constructor` that **does not apply any runtime checks** and just returns the provided value. Call `Brand.nominal` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Brand.all`

- **Source:** `packages/effect/src/Brand.ts:308`
- **Kind / category:** `root-declaration` / `combining`
- **Priority:** **optional**
- **Current description:** Combines one or more brand constructors to form a single branded type.
- **Signature hint:** `declare function all<Brands extends readonly [Constructor<any>, ...Array<Constructor<any>>]>(...brands: Brand.EnsureCommonBase<Brands>): Constructor<Types.UnionToIntersection<{ [B in keyof Brands]: Brand.FromConstructor<Brands[B]>; }[number]> extends infer X extends Brand<any> ? X : Brand<any>>`
- **Import guidance:** Start from `import { Brand } from "effect"` and use `Brand.all`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Combines one or more brand constructors to form a single branded type. Call `Brand.all` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Brand.Brand (type) (type)`

- **Source:** `packages/effect/src/Brand.ts:35`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A generic interface that defines a branded type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Brand.Brand (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Brand.Constructor`

- **Source:** `packages/effect/src/Brand.ts:59`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A constructor for a branded type that provides validation and safe construction methods.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Brand.Constructor`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Brand.Constructor.option`

- **Source:** `packages/effect/src/Brand.ts:69`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Constructs a branded type from a value of type `Unbranded<B>`, returning `Some<B>` if the provided value is valid, `None` otherwise.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Brand.Constructor.option` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Brand.Constructor.result`

- **Source:** `packages/effect/src/Brand.ts:75`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Constructs a branded type from a value of type `Unbranded<B>`, returning `Success<B>` if the provided value is valid, `Failure<BrandError>` otherwise.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Brand.Constructor.result` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Brand.Constructor.is`

- **Source:** `packages/effect/src/Brand.ts:80`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Attempts to refine the provided value of type `Unbranded<B>`, returning `true` if the provided value is a valid branded type, `false` otherwise.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Brand.Constructor.is` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Brand.BrandError._tag`

- **Source:** `packages/effect/src/Brand.ts:115`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Discriminant used to identify brand construction failures.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Brand.BrandError._tag` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Brand.BrandError.name`

- **Source:** `packages/effect/src/Brand.ts:121`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Error name used by tools that inspect JavaScript error-like objects.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Brand.BrandError.name` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Brand.BrandError.issue`

- **Source:** `packages/effect/src/Brand.ts:127`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Schema issue describing why brand validation failed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Brand.BrandError.issue` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Brand.BrandError.message`

- **Source:** `packages/effect/src/Brand.ts:133`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Human-readable rendering of the validation issue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Brand.BrandError.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Brand.BrandError.toString`

- **Source:** `packages/effect/src/Brand.ts:141`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formats the brand error together with its validation message.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Brand.BrandError.toString` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Brand.Brand (type) (type)`

- **Source:** `packages/effect/src/Brand.ts:152`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing type-level helpers for working with branded types and brand constructors.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Brand.Brand (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Brand.Brand.FromConstructor`

- **Source:** `packages/effect/src/Brand.ts:159`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to extract a branded type from a `Constructor`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Brand.Brand.FromConstructor`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Brand.Brand.Unbranded`

- **Source:** `packages/effect/src/Brand.ts:167`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to extract the unbranded value type from a brand.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Brand.Brand.Unbranded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Brand.Brand.Keys`

- **Source:** `packages/effect/src/Brand.ts:175`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to extract the keys of a branded type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Brand.Brand.Keys`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Brand.Brand.Brands`

- **Source:** `packages/effect/src/Brand.ts:183`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to extract the brands from a branded type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Brand.Brand.Brands`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Brand.Brand.EnsureCommonBase`

- **Source:** `packages/effect/src/Brand.ts:193`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type that checks that all brands have the same base type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Brand.Brand.EnsureCommonBase`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Brand.Branded`

- **Source:** `packages/effect/src/Brand.ts:211`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A type alias for creating branded types more concisely.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Brand.Branded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
