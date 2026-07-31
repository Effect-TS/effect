# Example Suggestions: `@effect/doctest/Source`

- **Package:** `@effect/doctest`
- **Source:** `packages/tools/doctest/src/Source.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 0 recommended, 4 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                   | Line | Kind               | Priority     |
| ------------------------------------- | ---: | ------------------ | ------------ |
| `@effect/doctest/Source.extract`      |   83 | `root-declaration` | **optional** |
| `@effect/doctest/Source.extractFile`  |  100 | `root-declaration` | **optional** |
| `@effect/doctest/Source.Snippet`      |   13 | `root-declaration` | **optional** |
| `@effect/doctest/Source.SourceFormat` |   25 | `root-declaration` | **optional** |

## Optional

### `@effect/doctest/Source.extract`

- **Source:** `packages/tools/doctest/src/Source.ts:83`
- **Kind / category:** `root-declaration` / `extraction`
- **Priority:** **optional**
- **Current description:** Extracts marked TypeScript code snippets from documentation text.
- **Signature hint:** `declare function extract(source: string, format?: SourceFormat): ReadonlyArray<Snippet>`
- **Import guidance:** Start from `import { Source } from "@effect/doctest"` and use `Source.extract`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Extracts marked TypeScript code snippets from documentation text. Call `Source.extract` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/doctest/Source.extractFile`

- **Source:** `packages/tools/doctest/src/Source.ts:100`
- **Kind / category:** `root-declaration` / `extraction`
- **Priority:** **optional**
- **Current description:** Reads a file and extracts its marked code snippets.
- **Signature hint:** `declare function extractFile(file: string): Promise<ReadonlyArray<Snippet>>`
- **Import guidance:** Start from `import { Source } from "@effect/doctest"` and use `Source.extractFile`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Reads a file and extracts its marked code snippets. Call `Source.extractFile` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/doctest/Source.Snippet`

- **Source:** `packages/tools/doctest/src/Source.ts:13`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents an executable TypeScript code snippet.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/doctest/Source.Snippet`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/doctest/Source.SourceFormat`

- **Source:** `packages/tools/doctest/src/Source.ts:25`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Identifies how documentation is embedded in the source text.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/doctest/Source.SourceFormat`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
