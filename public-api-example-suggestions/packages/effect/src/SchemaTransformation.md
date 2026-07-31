# Example Suggestions: `effect/SchemaTransformation`

- **Package:** `effect`
- **Source:** `packages/effect/src/SchemaTransformation.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 0 recommended, 6 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                    | Line | Kind               | Priority     |
| ------------------------------------------------------ | ---: | ------------------ | ------------ |
| `effect/SchemaTransformation.bigDecimalFromString`     | 1424 | `root-declaration` | **optional** |
| `effect/SchemaTransformation.timeZoneOffsetFromNumber` | 1757 | `root-declaration` | **optional** |
| `effect/SchemaTransformation.timeZoneNamedFromString`  | 1784 | `root-declaration` | **optional** |
| `effect/SchemaTransformation.timeZoneFromString`       | 1819 | `root-declaration` | **optional** |
| `effect/SchemaTransformation.dateTimeUtcFromString`    | 1853 | `root-declaration` | **optional** |
| `effect/SchemaTransformation.dateTimeZonedFromString`  | 1887 | `root-declaration` | **optional** |

## Optional

### `effect/SchemaTransformation.bigDecimalFromString`

- **Source:** `packages/effect/src/SchemaTransformation.ts:1424`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Decodes a `string` into a `BigDecimal` and encodes a `BigDecimal` back to its string representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaTransformation } from "effect"` and use `SchemaTransformation.bigDecimalFromString`.
- **Suggested snippet:** Use `SchemaTransformation.bigDecimalFromString` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaTransformation.timeZoneOffsetFromNumber`

- **Source:** `packages/effect/src/SchemaTransformation.ts:1757`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Decodes a numeric time-zone offset in milliseconds into a `DateTime.TimeZone.Offset` and encodes it back to the offset number.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaTransformation } from "effect"` and use `SchemaTransformation.timeZoneOffsetFromNumber`.
- **Suggested snippet:** Use `SchemaTransformation.timeZoneOffsetFromNumber` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaTransformation.timeZoneNamedFromString`

- **Source:** `packages/effect/src/SchemaTransformation.ts:1784`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Decodes an IANA time-zone identifier string into a `DateTime.TimeZone.Named` and encodes a named time zone back to its `id`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaTransformation } from "effect"` and use `SchemaTransformation.timeZoneNamedFromString`.
- **Suggested snippet:** Use `SchemaTransformation.timeZoneNamedFromString` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaTransformation.timeZoneFromString`

- **Source:** `packages/effect/src/SchemaTransformation.ts:1819`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Decodes a string into a `DateTime.TimeZone` and encodes a time zone back to its string representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaTransformation } from "effect"` and use `SchemaTransformation.timeZoneFromString`.
- **Suggested snippet:** Use `SchemaTransformation.timeZoneFromString` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaTransformation.dateTimeUtcFromString`

- **Source:** `packages/effect/src/SchemaTransformation.ts:1853`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Decodes a date-time string into a `DateTime.Utc` and encodes it back to an ISO string.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaTransformation } from "effect"` and use `SchemaTransformation.dateTimeUtcFromString`.
- **Suggested snippet:** Use `SchemaTransformation.dateTimeUtcFromString` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SchemaTransformation.dateTimeZonedFromString`

- **Source:** `packages/effect/src/SchemaTransformation.ts:1887`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Decodes a zoned date-time string into a `DateTime.Zoned` and encodes it back to an ISO zoned string.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SchemaTransformation } from "effect"` and use `SchemaTransformation.dateTimeZonedFromString`.
- **Suggested snippet:** Use `SchemaTransformation.dateTimeZonedFromString` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
