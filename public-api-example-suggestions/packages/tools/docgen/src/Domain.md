# Example Suggestions: `@effect/docgen/Domain`

- **Package:** `@effect/docgen`
- **Source:** `packages/tools/docgen/src/Domain.ts`
- **Uncovered API records:** 17
- **Priorities:** 0 required, 1 recommended, 14 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                               | Line | Kind               | Priority        |
| ------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/docgen/Domain.DocgenError`               |  320 | `root-declaration` | **recommended** |
| `@effect/docgen/Domain.ByPath`                    |  272 | `root-declaration` | **optional**    |
| `@effect/docgen/Domain.Process`                   |  330 | `root-declaration` | **optional**    |
| `@effect/docgen/Domain.DocEntry`                  |   23 | `root-declaration` | **optional**    |
| `@effect/docgen/Domain.Doc`                       |   47 | `root-declaration` | **optional**    |
| `@effect/docgen/Domain.Module`                    |   96 | `root-declaration` | **optional**    |
| `@effect/docgen/Domain.Class`                     |  141 | `root-declaration` | **optional**    |
| `@effect/docgen/Domain.Interface`                 |  168 | `root-declaration` | **optional**    |
| `@effect/docgen/Domain.Position`                  |  178 | `root-declaration` | **optional**    |
| `@effect/docgen/Domain.Function`                  |  189 | `root-declaration` | **optional**    |
| `@effect/docgen/Domain.TypeAlias`                 |  199 | `root-declaration` | **optional**    |
| `@effect/docgen/Domain.Constant`                  |  209 | `root-declaration` | **optional**    |
| `@effect/docgen/Domain.Export`                    |  219 | `root-declaration` | **optional**    |
| `@effect/docgen/Domain.Namespace`                 |  240 | `root-declaration` | **optional**    |
| `@effect/docgen/Domain.File`                      |  283 | `root-declaration` | **optional**    |
| `@effect/docgen/Domain.DocgenErrorTypeId (value)` |  304 | `root-declaration` | **discouraged** |
| `@effect/docgen/Domain.DocgenErrorTypeId (type)`  |  312 | `root-declaration` | **discouraged** |

## Recommended

### `@effect/docgen/Domain.DocgenError`

- **Source:** `packages/tools/docgen/src/Domain.ts:320`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error reported when documentation generation cannot continue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Domain } from "@effect/docgen"` and use `Domain.DocgenError`.
- **Suggested snippet:** Create or capture `Domain.DocgenError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/docgen/Domain.ByPath`

- **Source:** `packages/tools/docgen/src/Domain.ts:272`
- **Kind / category:** `root-declaration` / `sorting`
- **Priority:** **optional**
- **Current description:** A comparator function for sorting `Module` objects by their file path, represented as a string. The file path is converted to lowercase before comparison.
- **Signature hint:** `declare function ByPath(self: Module, that: Module): Ordering`
- **Import guidance:** Start from `import { Domain } from "@effect/docgen"` and use `Domain.ByPath`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: A comparator function for sorting `Module` objects by their file path, represented as a string. The file path is converted to lowercase before comparison. Call `Domain.ByPath` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/docgen/Domain.Process`

- **Source:** `packages/tools/docgen/src/Domain.ts:330`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **optional**
- **Current description:** Represents a handle to the currently executing process.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Domain } from "@effect/docgen"` and use `Domain.Process`.
- **Suggested snippet:** Consume `Domain.Process` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/docgen/Domain.DocEntry`

- **Source:** `packages/tools/docgen/src/Domain.ts:23`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Base model for a named, documented declaration.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Domain } from "@effect/docgen"` and use `Domain.DocEntry`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Domain.DocEntry`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/docgen/Domain.Doc`

- **Source:** `packages/tools/docgen/src/Domain.ts:47`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed JSDoc content attached to a declaration or module.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Domain } from "@effect/docgen"` and use `Domain.Doc`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Domain.Doc`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/docgen/Domain.Module`

- **Source:** `packages/tools/docgen/src/Domain.ts:96`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed documentation model for one source module.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Domain } from "@effect/docgen"` and use `Domain.Module`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Domain.Module`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/docgen/Domain.Class`

- **Source:** `packages/tools/docgen/src/Domain.ts:141`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed documentation model for a class and its documented members.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Domain } from "@effect/docgen"` and use `Domain.Class`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Domain.Class`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/docgen/Domain.Interface`

- **Source:** `packages/tools/docgen/src/Domain.ts:168`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed documentation model for an interface.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Domain } from "@effect/docgen"` and use `Domain.Interface`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Domain.Interface`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/docgen/Domain.Position`

- **Source:** `packages/tools/docgen/src/Domain.ts:178`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** One-based source position used in diagnostics.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/docgen/Domain.Position`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/docgen/Domain.Function`

- **Source:** `packages/tools/docgen/src/Domain.ts:189`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed documentation model for a function.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Domain } from "@effect/docgen"` and use `Domain.Function`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Domain.Function`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/docgen/Domain.TypeAlias`

- **Source:** `packages/tools/docgen/src/Domain.ts:199`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed documentation model for a type alias.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Domain } from "@effect/docgen"` and use `Domain.TypeAlias`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Domain.TypeAlias`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/docgen/Domain.Constant`

- **Source:** `packages/tools/docgen/src/Domain.ts:209`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed documentation model for a constant.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Domain } from "@effect/docgen"` and use `Domain.Constant`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Domain.Constant`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/docgen/Domain.Export`

- **Source:** `packages/tools/docgen/src/Domain.ts:219`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed documentation model for an explicit named or namespace export.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Domain } from "@effect/docgen"` and use `Domain.Export`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Domain.Export`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/docgen/Domain.Namespace`

- **Source:** `packages/tools/docgen/src/Domain.ts:240`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed documentation model for a namespace and its nested declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Domain } from "@effect/docgen"` and use `Domain.Namespace`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Domain.Namespace`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/docgen/Domain.File`

- **Source:** `packages/tools/docgen/src/Domain.ts:283`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a file which can be optionally overwriteable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Domain } from "@effect/docgen"` and use `Domain.File`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Domain.File`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `@effect/docgen/Domain.DocgenErrorTypeId (value)`

- **Source:** `packages/tools/docgen/src/Domain.ts:304`
- **Kind / category:** `root-declaration` / `symbols`
- **Priority:** **discouraged**
- **Current description:** Type ID for `DocgenError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Domain } from "@effect/docgen"` and use `Domain.DocgenErrorTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Domain.DocgenErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `@effect/docgen/Domain.DocgenErrorTypeId (type)`

- **Source:** `packages/tools/docgen/src/Domain.ts:312`
- **Kind / category:** `root-declaration` / `symbols`
- **Priority:** **discouraged**
- **Current description:** Type-level representation of `DocgenErrorTypeId`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `@effect/docgen/Domain.DocgenErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
