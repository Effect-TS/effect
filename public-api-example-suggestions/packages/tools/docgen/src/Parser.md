# Example Suggestions: `@effect/docgen/Parser`

- **Package:** `@effect/docgen`
- **Source:** `packages/tools/docgen/src/Parser.ts`
- **Uncovered API records:** 10
- **Priorities:** 0 required, 1 recommended, 9 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                      | Line | Kind               | Priority        |
| ---------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/docgen/Parser.parseFiles`       |  723 | `root-declaration` | **recommended** |
| `@effect/docgen/Parser.parseInterfaces`  |  154 | `root-declaration` | **optional**    |
| `@effect/docgen/Parser.parseFunctions`   |  263 | `root-declaration` | **optional**    |
| `@effect/docgen/Parser.parseTypeAliases` |  310 | `root-declaration` | **optional**    |
| `@effect/docgen/Parser.parseConstants`   |  342 | `root-declaration` | **optional**    |
| `@effect/docgen/Parser.parseExports`     |  421 | `root-declaration` | **optional**    |
| `@effect/docgen/Parser.parseNamespaces`  |  469 | `root-declaration` | **optional**    |
| `@effect/docgen/Parser.parseClasses`     |  618 | `root-declaration` | **optional**    |
| `@effect/docgen/Parser.parseModule`      |  646 | `root-declaration` | **optional**    |
| `@effect/docgen/Parser.SourceShape`      |   25 | `root-declaration` | **optional**    |

## Recommended

### `@effect/docgen/Parser.parseFiles`

- **Source:** `packages/tools/docgen/src/Parser.ts:723`
- **Kind / category:** `root-declaration` / `parsers`
- **Priority:** **recommended**
- **Current description:** Parses source files into module documentation models sorted by path.
- **Signature hint:** `declare function parseFiles(files: ReadonlyArray<Domain.File>): Effect.Effect<Domain.Module[], [string[], ...string[][]], Path.Path | Configuration.Configuration | Domain.Process>`
- **Import guidance:** Start from `import { Parser } from "@effect/docgen"` and use `Parser.parseFiles`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Parser.parseFiles`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/docgen/Parser.parseInterfaces`

- **Source:** `packages/tools/docgen/src/Parser.ts:154`
- **Kind / category:** `root-declaration` / `parsers`
- **Priority:** **optional**
- **Current description:** Parses exported interfaces from the current source file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Parser } from "@effect/docgen"` and use `Parser.parseInterfaces`.
- **Suggested snippet:** Convert one representative external input with `Parser.parseInterfaces` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/docgen/Parser.parseFunctions`

- **Source:** `packages/tools/docgen/src/Parser.ts:263`
- **Kind / category:** `root-declaration` / `parsers`
- **Priority:** **optional**
- **Current description:** Parses exported function declarations and function-valued variables.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Parser } from "@effect/docgen"` and use `Parser.parseFunctions`.
- **Suggested snippet:** Convert one representative external input with `Parser.parseFunctions` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/docgen/Parser.parseTypeAliases`

- **Source:** `packages/tools/docgen/src/Parser.ts:310`
- **Kind / category:** `root-declaration` / `parsers`
- **Priority:** **optional**
- **Current description:** Parses exported type aliases from the current source file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Parser } from "@effect/docgen"` and use `Parser.parseTypeAliases`.
- **Suggested snippet:** Convert one representative external input with `Parser.parseTypeAliases` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/docgen/Parser.parseConstants`

- **Source:** `packages/tools/docgen/src/Parser.ts:342`
- **Kind / category:** `root-declaration` / `parsers`
- **Priority:** **optional**
- **Current description:** Parses exported non-function constants from the current source file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Parser } from "@effect/docgen"` and use `Parser.parseConstants`.
- **Suggested snippet:** Convert one representative external input with `Parser.parseConstants` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/docgen/Parser.parseExports`

- **Source:** `packages/tools/docgen/src/Parser.ts:421`
- **Kind / category:** `root-declaration` / `parsers`
- **Priority:** **optional**
- **Current description:** Parses explicit export declarations from the current source file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Parser } from "@effect/docgen"` and use `Parser.parseExports`.
- **Suggested snippet:** Convert one representative external input with `Parser.parseExports` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/docgen/Parser.parseNamespaces`

- **Source:** `packages/tools/docgen/src/Parser.ts:469`
- **Kind / category:** `root-declaration` / `parsers`
- **Priority:** **optional**
- **Current description:** Parses exported namespaces from the current source file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Parser } from "@effect/docgen"` and use `Parser.parseNamespaces`.
- **Suggested snippet:** Convert one representative external input with `Parser.parseNamespaces` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/docgen/Parser.parseClasses`

- **Source:** `packages/tools/docgen/src/Parser.ts:618`
- **Kind / category:** `root-declaration` / `parsers`
- **Priority:** **optional**
- **Current description:** Parses exported classes and their documented members from the current source file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Parser } from "@effect/docgen"` and use `Parser.parseClasses`.
- **Suggested snippet:** Convert one representative external input with `Parser.parseClasses` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/docgen/Parser.parseModule`

- **Source:** `packages/tools/docgen/src/Parser.ts:646`
- **Kind / category:** `root-declaration` / `parsers`
- **Priority:** **optional**
- **Current description:** Parses the current source file into a module documentation model.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Parser } from "@effect/docgen"` and use `Parser.parseModule`.
- **Suggested snippet:** Convert one representative external input with `Parser.parseModule` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/docgen/Parser.SourceShape`

- **Source:** `packages/tools/docgen/src/Parser.ts:25`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Source file and path currently being parsed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/docgen/Parser.SourceShape`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
