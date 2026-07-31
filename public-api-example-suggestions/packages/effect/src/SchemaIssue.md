# Example Suggestions: `effect/SchemaIssue`

- **Package:** `effect`
- **Source:** `packages/effect/src/SchemaIssue.ts`
- **Uncovered API records:** 39
- **Priorities:** 0 required, 0 recommended, 39 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                           | Line | Kind               | Priority     |
| --------------------------------------------- | ---: | ------------------ | ------------ |
| `effect/SchemaIssue.Formatter`                |  847 | `root-declaration` | **optional** |
| `effect/SchemaIssue.LeafHook`                 |  863 | `root-declaration` | **optional** |
| `effect/SchemaIssue.CheckHook`                |  938 | `root-declaration` | **optional** |
| `effect/SchemaIssue.defaultCheckHook`         |  960 | `root-declaration` | **optional** |
| `effect/SchemaIssue.Leaf`                     |   76 | `root-declaration` | **optional** |
| `effect/SchemaIssue.Issue`                    |  107 | `root-declaration` | **optional** |
| `effect/SchemaIssue.Filter.actual`            |  169 | `member`           | **optional** |
| `effect/SchemaIssue.Filter.filter`            |  173 | `member`           | **optional** |
| `effect/SchemaIssue.Filter.issue`             |  177 | `member`           | **optional** |
| `effect/SchemaIssue.Encoding`                 |  221 | `root-declaration` | **optional** |
| `effect/SchemaIssue.Encoding.ast`             |  226 | `member`           | **optional** |
| `effect/SchemaIssue.Encoding.actual`          |  230 | `member`           | **optional** |
| `effect/SchemaIssue.Encoding.issue`           |  234 | `member`           | **optional** |
| `effect/SchemaIssue.Pointer`                  |  279 | `root-declaration` | **optional** |
| `effect/SchemaIssue.Pointer.path`             |  284 | `member`           | **optional** |
| `effect/SchemaIssue.Pointer.issue`            |  288 | `member`           | **optional** |
| `effect/SchemaIssue.MissingKey`               |  324 | `root-declaration` | **optional** |
| `effect/SchemaIssue.MissingKey.annotations`   |  329 | `member`           | **optional** |
| `effect/SchemaIssue.UnexpectedKey`            |  363 | `root-declaration` | **optional** |
| `effect/SchemaIssue.UnexpectedKey.ast`        |  368 | `member`           | **optional** |
| `effect/SchemaIssue.UnexpectedKey.actual`     |  372 | `member`           | **optional** |
| `effect/SchemaIssue.Composite`                |  411 | `root-declaration` | **optional** |
| `effect/SchemaIssue.Composite.ast`            |  416 | `member`           | **optional** |
| `effect/SchemaIssue.Composite.actual`         |  420 | `member`           | **optional** |
| `effect/SchemaIssue.Composite.issues`         |  424 | `member`           | **optional** |
| `effect/SchemaIssue.InvalidType.ast`          |  487 | `member`           | **optional** |
| `effect/SchemaIssue.InvalidType.actual`       |  491 | `member`           | **optional** |
| `effect/SchemaIssue.InvalidValue.actual`      |  549 | `member`           | **optional** |
| `effect/SchemaIssue.InvalidValue.annotations` |  553 | `member`           | **optional** |
| `effect/SchemaIssue.Forbidden.actual`         |  609 | `member`           | **optional** |
| `effect/SchemaIssue.Forbidden.annotations`    |  613 | `member`           | **optional** |
| `effect/SchemaIssue.AnyOf`                    |  652 | `root-declaration` | **optional** |
| `effect/SchemaIssue.AnyOf.ast`                |  657 | `member`           | **optional** |
| `effect/SchemaIssue.AnyOf.actual`             |  661 | `member`           | **optional** |
| `effect/SchemaIssue.AnyOf.issues`             |  665 | `member`           | **optional** |
| `effect/SchemaIssue.OneOf`                    |  710 | `root-declaration` | **optional** |
| `effect/SchemaIssue.OneOf.ast`                |  715 | `member`           | **optional** |
| `effect/SchemaIssue.OneOf.actual`             |  719 | `member`           | **optional** |
| `effect/SchemaIssue.OneOf.successes`          |  723 | `member`           | **optional** |

## Optional

### `effect/SchemaIssue.Formatter`

- **Source:** `packages/effect/src/SchemaIssue.ts:847`
- **Kind / category:** `root-declaration` / `Formatter`
- **Priority:** **optional**
- **Current description:** A function type that converts an `Issue` into a formatted representation. Specialisation of the generic `Formatter` from `Formatter.ts` with `Value` fixed to `Issue`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaIssue.Formatter`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.LeafHook`

- **Source:** `packages/effect/src/SchemaIssue.ts:863`
- **Kind / category:** `root-declaration` / `Formatter`
- **Priority:** **optional**
- **Current description:** Callback type used to format `Leaf` issues into strings.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaIssue.LeafHook`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.CheckHook`

- **Source:** `packages/effect/src/SchemaIssue.ts:938`
- **Kind / category:** `root-declaration` / `Formatter`
- **Priority:** **optional**
- **Current description:** Callback type used to format `Filter` issues into strings.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaIssue.CheckHook`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.defaultCheckHook`

- **Source:** `packages/effect/src/SchemaIssue.ts:960`
- **Kind / category:** `root-declaration` / `Formatter`
- **Priority:** **optional**
- **Current description:** Returns the built-in `CheckHook` used by default formatters.
- **Signature hint:** `declare function defaultCheckHook(issue: Filter): string | undefined`
- **Import guidance:** Start from `import { SchemaIssue } from "effect"` and use `SchemaIssue.defaultCheckHook`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns the built-in `CheckHook` used by default formatters. Call `SchemaIssue.defaultCheckHook` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.Leaf`

- **Source:** `packages/effect/src/SchemaIssue.ts:76`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Union of all terminal (leaf) issue types that have no inner `Issue` children.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaIssue.Leaf`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.Issue`

- **Source:** `packages/effect/src/SchemaIssue.ts:107`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The root discriminated union of all validation error nodes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SchemaIssue.Issue`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.Filter.actual`

- **Source:** `packages/effect/src/SchemaIssue.ts:169`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The input value that caused the issue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.Filter.actual` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.Filter.filter`

- **Source:** `packages/effect/src/SchemaIssue.ts:173`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The filter that failed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.Filter.filter` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.Filter.issue`

- **Source:** `packages/effect/src/SchemaIssue.ts:177`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The issue that occurred.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.Filter.issue` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.Encoding`

- **Source:** `packages/effect/src/SchemaIssue.ts:221`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a schema issue produced when a schema transformation (encode/decode step) fails.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaIssue } from "effect"` and use `SchemaIssue.Encoding`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaIssue.Encoding`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.Encoding.ast`

- **Source:** `packages/effect/src/SchemaIssue.ts:226`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The schema that caused the issue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.Encoding.ast` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.Encoding.actual`

- **Source:** `packages/effect/src/SchemaIssue.ts:230`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The input value that caused the issue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.Encoding.actual` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.Encoding.issue`

- **Source:** `packages/effect/src/SchemaIssue.ts:234`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The issue that occurred.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.Encoding.issue` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.Pointer`

- **Source:** `packages/effect/src/SchemaIssue.ts:279`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Wraps an inner `Issue` with a property-key path, indicating _where_ in a nested structure the error occurred.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaIssue } from "effect"` and use `SchemaIssue.Pointer`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaIssue.Pointer`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.Pointer.path`

- **Source:** `packages/effect/src/SchemaIssue.ts:284`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The path to the location in the input that caused the issue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.Pointer.path` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.Pointer.issue`

- **Source:** `packages/effect/src/SchemaIssue.ts:288`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The issue that occurred.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.Pointer.issue` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.MissingKey`

- **Source:** `packages/effect/src/SchemaIssue.ts:324`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a schema issue produced when a required key or tuple index is missing from the input.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaIssue } from "effect"` and use `SchemaIssue.MissingKey`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaIssue.MissingKey`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.MissingKey.annotations`

- **Source:** `packages/effect/src/SchemaIssue.ts:329`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The metadata for the issue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.MissingKey.annotations` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.UnexpectedKey`

- **Source:** `packages/effect/src/SchemaIssue.ts:363`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a schema issue produced when an input object or tuple contains a key/index not declared by the schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaIssue } from "effect"` and use `SchemaIssue.UnexpectedKey`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaIssue.UnexpectedKey`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.UnexpectedKey.ast`

- **Source:** `packages/effect/src/SchemaIssue.ts:368`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The schema that caused the issue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.UnexpectedKey.ast` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.UnexpectedKey.actual`

- **Source:** `packages/effect/src/SchemaIssue.ts:372`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The input value that caused the issue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.UnexpectedKey.actual` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.Composite`

- **Source:** `packages/effect/src/SchemaIssue.ts:411`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a schema issue that groups multiple child issues under a single schema node.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaIssue } from "effect"` and use `SchemaIssue.Composite`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaIssue.Composite`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.Composite.ast`

- **Source:** `packages/effect/src/SchemaIssue.ts:416`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The schema that caused the issue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.Composite.ast` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.Composite.actual`

- **Source:** `packages/effect/src/SchemaIssue.ts:420`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The input value that caused the issue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.Composite.actual` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.Composite.issues`

- **Source:** `packages/effect/src/SchemaIssue.ts:424`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The issues that occurred.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.Composite.issues` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.InvalidType.ast`

- **Source:** `packages/effect/src/SchemaIssue.ts:487`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The schema that caused the issue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.InvalidType.ast` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.InvalidType.actual`

- **Source:** `packages/effect/src/SchemaIssue.ts:491`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The input value that caused the issue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.InvalidType.actual` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.InvalidValue.actual`

- **Source:** `packages/effect/src/SchemaIssue.ts:549`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The value that caused the issue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.InvalidValue.actual` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.InvalidValue.annotations`

- **Source:** `packages/effect/src/SchemaIssue.ts:553`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The metadata for the issue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.InvalidValue.annotations` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.Forbidden.actual`

- **Source:** `packages/effect/src/SchemaIssue.ts:609`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The input value that caused the issue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.Forbidden.actual` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.Forbidden.annotations`

- **Source:** `packages/effect/src/SchemaIssue.ts:613`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The metadata for the issue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.Forbidden.annotations` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.AnyOf`

- **Source:** `packages/effect/src/SchemaIssue.ts:652`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a schema issue produced when a value does not match _any_ member of a union schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaIssue } from "effect"` and use `SchemaIssue.AnyOf`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaIssue.AnyOf`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.AnyOf.ast`

- **Source:** `packages/effect/src/SchemaIssue.ts:657`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The schema that caused the issue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.AnyOf.ast` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.AnyOf.actual`

- **Source:** `packages/effect/src/SchemaIssue.ts:661`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The input value that caused the issue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.AnyOf.actual` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.AnyOf.issues`

- **Source:** `packages/effect/src/SchemaIssue.ts:665`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The issues that occurred.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.AnyOf.issues` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.OneOf`

- **Source:** `packages/effect/src/SchemaIssue.ts:710`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a schema issue produced when a value matches _multiple_ members of a union that is configured to allow exactly one match (oneOf mode).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaIssue } from "effect"` and use `SchemaIssue.OneOf`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `SchemaIssue.OneOf`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.OneOf.ast`

- **Source:** `packages/effect/src/SchemaIssue.ts:715`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The schema that caused the issue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.OneOf.ast` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.OneOf.actual`

- **Source:** `packages/effect/src/SchemaIssue.ts:719`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The input value that caused the issue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.OneOf.actual` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaIssue.OneOf.successes`

- **Source:** `packages/effect/src/SchemaIssue.ts:723`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The schemas that were successful.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/SchemaIssue.OneOf.successes` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
