# Example Suggestions: `effect/String`

- **Package:** `effect`
- **Source:** `packages/effect/src/String.ts`
- **Uncovered API records:** 9
- **Priorities:** 0 required, 1 recommended, 8 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                           | Line | Kind               | Priority        |
| ----------------------------- | ---: | ------------------ | --------------- |
| `effect/String.ReducerConcat` | 1431 | `root-declaration` | **recommended** |
| `effect/String.String`        |   42 | `root-declaration` | **optional**    |
| `effect/String.noCase`        | 1218 | `root-declaration` | **optional**    |
| `effect/String.pascalCase`    | 1299 | `root-declaration` | **optional**    |
| `effect/String.camelCase`     | 1326 | `root-declaration` | **optional**    |
| `effect/String.constantCase`  | 1349 | `root-declaration` | **optional**    |
| `effect/String.configCase`    | 1372 | `root-declaration` | **optional**    |
| `effect/String.kebabCase`     | 1392 | `root-declaration` | **optional**    |
| `effect/String.snakeCase`     | 1411 | `root-declaration` | **optional**    |

## Recommended

### `effect/String.ReducerConcat`

- **Source:** `packages/effect/src/String.ts:1431`
- **Kind / category:** `root-declaration` / `combining`
- **Priority:** **recommended**
- **Current description:** Reducer for concatenating `string`s.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { String } from "effect"` and use `String.ReducerConcat`.
- **Suggested snippet:** Apply `String.ReducerConcat` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/String.String`

- **Source:** `packages/effect/src/String.ts:42`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Exposes the global string constructor.
- **Signature hint:** `declare function String(value?: any): string`
- **Import guidance:** Start from `import { String } from "effect"` and use `String.String`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Exposes the global string constructor. Call `String.String` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/String.noCase`

- **Source:** `packages/effect/src/String.ts:1218`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Normalizes a string by splitting it into word parts, transforming each part, and joining the parts with a configurable delimiter.
- **Signature hint:** `declare function noCase(options?: { readonly splitRegExp?: RegExp | ReadonlyArray<RegExp> | undefined; readonly stripRegExp?: RegExp | ReadonlyArray<RegExp> | undefined; readonly delimiter?: string | undefined; readonly transform?: (part: string, index: number, parts: ReadonlyArray<string>) => string; }): (self: string) => string declare function noCase(self: string, options?: { readonly splitRegExp?: RegExp | ReadonlyArray<RegExp> | undefined; readonly stripRegExp?: RegExp | ReadonlyArray<RegExp> | undefined; readonly delimiter?: string | undefined; readonly transform?: (part: string, index: number, parts: ReadonlyArray<string>) => string; }): string`
- **Import guidance:** Start from `import { String } from "effect"` and use `String.noCase`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Normalizes a string by splitting it into word parts, transforming each part, and joining the parts with a configurable delimiter. Call `String.noCase` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/String.pascalCase`

- **Source:** `packages/effect/src/String.ts:1299`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Converts a string to PascalCase.
- **Signature hint:** `declare function pascalCase(self: string): string`
- **Import guidance:** Start from `import { String } from "effect"` and use `String.pascalCase`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Converts a string to PascalCase. Call `String.pascalCase` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/String.camelCase`

- **Source:** `packages/effect/src/String.ts:1326`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Converts a string to camelCase.
- **Signature hint:** `declare function camelCase(self: string): string`
- **Import guidance:** Start from `import { String } from "effect"` and use `String.camelCase`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Converts a string to camelCase. Call `String.camelCase` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/String.constantCase`

- **Source:** `packages/effect/src/String.ts:1349`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Converts a string to CONSTANT_CASE (uppercase with underscores).
- **Signature hint:** `declare function constantCase(self: string): string`
- **Import guidance:** Start from `import { String } from "effect"` and use `String.constantCase`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Converts a string to CONSTANT_CASE (uppercase with underscores). Call `String.constantCase` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/String.configCase`

- **Source:** `packages/effect/src/String.ts:1372`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Converts a string to CONFIG_CASE (uppercase with underscores) for configuration keys.
- **Signature hint:** `declare function configCase(self: string): string`
- **Import guidance:** Start from `import { String } from "effect"` and use `String.configCase`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Converts a string to CONFIG_CASE (uppercase with underscores) for configuration keys. Call `String.configCase` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/String.kebabCase`

- **Source:** `packages/effect/src/String.ts:1392`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Converts a string to kebab-case (lowercase with hyphens).
- **Signature hint:** `declare function kebabCase(self: string): string`
- **Import guidance:** Start from `import { String } from "effect"` and use `String.kebabCase`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Converts a string to kebab-case (lowercase with hyphens). Call `String.kebabCase` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/String.snakeCase`

- **Source:** `packages/effect/src/String.ts:1411`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Converts a string to snake_case (lowercase with underscores).
- **Signature hint:** `declare function snakeCase(self: string): string`
- **Import guidance:** Start from `import { String } from "effect"` and use `String.snakeCase`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Converts a string to snake_case (lowercase with underscores). Call `String.snakeCase` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
