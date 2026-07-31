# Example Suggestions: `@effect/openapi-generator/HttpApiTransformer`

- **Package:** `@effect/openapi-generator`
- **Source:** `packages/tools/openapi-generator/src/HttpApiTransformer.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                             | Line | Kind               | Priority        |
| --------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/openapi-generator/HttpApiTransformer.toImplementation` |   74 | `root-declaration` | **recommended** |
| `@effect/openapi-generator/HttpApiTransformer.imports`          |   50 | `root-declaration` | **optional**    |

## Recommended

### `@effect/openapi-generator/HttpApiTransformer.toImplementation`

- **Source:** `packages/tools/openapi-generator/src/HttpApiTransformer.ts:74`
- **Kind / category:** `root-declaration` / `code generation`
- **Priority:** **recommended**
- **Current description:** Convert a parsed OpenAPI document into Effect HttpApi source code.
- **Signature hint:** `declare function toImplementation(_importName: string, name: string, parsed: ParsedOpenApi): string`
- **Import guidance:** Start from `import { toImplementation } from "@effect/openapi-generator/HttpApiTransformer"` and use `toImplementation`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `toImplementation`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/openapi-generator/HttpApiTransformer.imports`

- **Source:** `packages/tools/openapi-generator/src/HttpApiTransformer.ts:50`
- **Kind / category:** `root-declaration` / `code generation`
- **Priority:** **optional**
- **Current description:** Render the import declarations required by generated HttpApi source.
- **Signature hint:** `declare function imports(importName: string, options?: { readonly multipart?: boolean | undefined; }): string`
- **Import guidance:** Start from `import { imports } from "@effect/openapi-generator/HttpApiTransformer"` and use `imports`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Render the import declarations required by generated HttpApi source. Call `imports` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
