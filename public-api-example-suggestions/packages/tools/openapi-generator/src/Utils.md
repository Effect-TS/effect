# Example Suggestions: `@effect/openapi-generator/Utils`

- **Package:** `@effect/openapi-generator`
- **Source:** `packages/tools/openapi-generator/src/Utils.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 0 recommended, 5 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                  | Line | Kind               | Priority     |
| ---------------------------------------------------- | ---: | ------------------ | ------------ |
| `@effect/openapi-generator/Utils.camelize`           |   25 | `root-declaration` | **optional** |
| `@effect/openapi-generator/Utils.identifier`         |   55 | `root-declaration` | **optional** |
| `@effect/openapi-generator/Utils.nonEmptyString`     |   68 | `root-declaration` | **optional** |
| `@effect/openapi-generator/Utils.toComment`          |   88 | `root-declaration` | **optional** |
| `@effect/openapi-generator/Utils.spreadElementsInto` |  107 | `root-declaration` | **optional** |

## Optional

### `@effect/openapi-generator/Utils.camelize`

- **Source:** `packages/tools/openapi-generator/src/Utils.ts:25`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Converts an OpenAPI name into the generator's camel-case form.
- **Signature hint:** `declare function camelize(self: string): string`
- **Import guidance:** Start from `import { camelize } from "@effect/openapi-generator/Utils"` and use `camelize`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Converts an OpenAPI name into the generator's camel-case form. Call `camelize` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/Utils.identifier`

- **Source:** `packages/tools/openapi-generator/src/Utils.ts:55`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Converts an OpenAPI operation id into the exported operation identifier used by generated TypeScript modules.
- **Signature hint:** `declare function identifier(operationId: string): Capitalize<string>`
- **Import guidance:** Start from `import { identifier } from "@effect/openapi-generator/Utils"` and use `identifier`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Converts an OpenAPI operation id into the exported operation identifier used by generated TypeScript modules. Call `identifier` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/Utils.nonEmptyString`

- **Source:** `packages/tools/openapi-generator/src/Utils.ts:68`
- **Kind / category:** `root-declaration` / `filtering`
- **Priority:** **optional**
- **Current description:** Extracts a trimmed, non-empty string from an unknown value.
- **Signature hint:** `declare function nonEmptyString(a: unknown): string | undefined`
- **Import guidance:** Start from `import { nonEmptyString } from "@effect/openapi-generator/Utils"` and use `nonEmptyString`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Extracts a trimmed, non-empty string from an unknown value. Call `nonEmptyString` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/Utils.toComment`

- **Source:** `packages/tools/openapi-generator/src/Utils.ts:88`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Renders an optional description as a JSDoc block for generated TypeScript.
- **Signature hint:** `declare function toComment(self: string | undefined): string`
- **Import guidance:** Start from `import { toComment } from "@effect/openapi-generator/Utils"` and use `toComment`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `toComment`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/Utils.spreadElementsInto`

- **Source:** `packages/tools/openapi-generator/src/Utils.ts:107`
- **Kind / category:** `root-declaration` / `concatenating`
- **Priority:** **optional**
- **Current description:** Appends every element from `source` into `destination` in order.
- **Signature hint:** `declare function spreadElementsInto<A>(source: Array<A>, destination: Array<A>): void`
- **Import guidance:** Start from `import { spreadElementsInto } from "@effect/openapi-generator/Utils"` and use `spreadElementsInto`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Appends every element from `source` into `destination` in order. Call `spreadElementsInto` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
