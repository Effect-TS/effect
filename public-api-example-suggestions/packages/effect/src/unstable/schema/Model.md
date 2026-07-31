# Example Suggestions: `effect/unstable/schema/Model`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/schema/Model.ts`
- **Uncovered API records:** 54
- **Priorities:** 0 required, 23 recommended, 31 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                             | Line | Kind               | Priority        |
| --------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/schema/Model.extract`                          |  124 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.fieldEvolve`                      |  138 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.FieldExcept`                      |  146 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.FieldOnly`                        |  153 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.GeneratedByDb (value)`            |  226 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.GeneratedByApp (value)`           |  259 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.Sensitive (value)`                |  289 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.optionalOption (value)`           |  314 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.FieldOption (value)`              |  358 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.BooleanSqlite (value)`            |  402 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.Date (value)`                     |  427 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.DateWithNow`                      |  441 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.DateTimeWithNow`                  |  452 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.DateTimeFromDateWithNow`          |  463 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.DateTimeFromNumberWithNow`        |  474 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.JsonFromString (value)`           |  708 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.Uint8Array`                       |  744 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.UuidV4BytesWithGenerate`          |  755 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.UuidV4BytesInsert (value)`        |  766 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.UuidV4WithGenerate`               |  798 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.UuidV4Insert (value)`             |  809 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.UuidV7WithGenerate`               |  841 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.UuidV7Insert (value)`             |  856 | `root-declaration` | **recommended** |
| `effect/unstable/schema/Model.optionalOption (type)`            |  303 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.Date (type)`                      |  418 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.Field`                            |  131 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.Struct`                           |  160 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.Union`                            |  168 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.fields`                           |  177 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.Override`                         |  187 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.GeneratedByDb (type)`             |  204 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.GeneratedByApp (type)`            |  242 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.Sensitive (type)`                 |  274 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.FieldOption (type)`               |  336 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.BooleanSqlite (type)`             |  384 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.DateTimeInsert (type)`            |  485 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.DateTimeInsert (value)`           |  504 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.DateTimeInsertFromDate (type)`    |  517 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.DateTimeInsertFromDate (value)`   |  536 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.DateTimeInsertFromNumber (type)`  |  549 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.DateTimeInsertFromNumber (value)` |  568 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.DateTimeUpdate (type)`            |  581 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.DateTimeUpdate (value)`           |  602 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.DateTimeUpdateFromDate (type)`    |  617 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.DateTimeUpdateFromDate (value)`   |  638 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.DateTimeUpdateFromNumber (type)`  |  652 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.DateTimeUpdateFromNumber (value)` |  673 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.UuidV4BytesInsert (type)`         |  729 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.UuidV4Insert (type)`              |  783 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.UuidV7Insert (type)`              |  826 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.Any`                              |   46 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.VariantsDatabase`                 |   61 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.VariantsJson`                     |   69 | `root-declaration` | **optional**    |
| `effect/unstable/schema/Model.JsonFromString (type)`            |  687 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/schema/Model.extract`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:124`
- **Kind / category:** `root-declaration` / `extraction`
- **Priority:** **recommended**
- **Current description:** Extracts a generated variant schema from a model or variant struct.
- **Signature hint:** `declare function extract<V extends 'insert' | 'select' | 'update' | 'json' | 'jsonCreate' | 'jsonUpdate'>(variant: V): <A extends VariantSchema.Struct<any>>(self: A) => VariantSchema.Extract<V, A, V extends 'select' ? true : false> declare function extract<V extends 'insert' | 'select' | 'update' | 'json' | 'jsonCreate' | 'jsonUpdate', A extends VariantSchema.Struct<any>>(self: A, variant: V): VariantSchema.Extract<V, A, V extends 'select' ? true : false>`
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.extract`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Extracts a generated variant schema from a model or variant struct. Call `Model.extract` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/Model.fieldEvolve`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:138`
- **Kind / category:** `root-declaration` / `fields`
- **Priority:** **recommended**
- **Current description:** Transforms schemas inside a variant field or plain schema by variant name.
- **Signature hint:** `declare const fieldEvolve: { <Self extends VariantSchema.Field<any> | Schema.Top, const Mapping extends Self extends VariantSchema.Field<infer S extends VariantSchema.Field.Config> ? { readonly [K in keyof S]?: (variant: S[K]) => Schema.Top; } : { readonly insert?: (variant: Self) => Schema.Top; readonly select?: (variant: Self) => Schema.Top; readonly update?: (variant: Self) => Schema.Top; readonly json?: (variant: Self) => Schema.Top; readonly jsonCreate?: (variant: Self) => Schema.Top; readonly jsonUpdate?: (variant: Self) => Schema.Top; }>(f: Mapping): (self: Self) => VariantSchema.Field<Self extends VariantSchema.Field<infer S extends VariantSchema.Field.Config> ? { readonly [K in keyof S]: K extends keyof Mapping ? Mapping[K] extends (arg: any) => any ? ReturnType<Mapping[K]> : S[K] : S[K]; } : { readonly insert: 'insert' extends keyof Mapping ? Mapping[keyof Mapping & 'insert'] extends (arg: any) => any ? ReturnType<Mapping[keyof Mapping & 'insert']> : Self : Self; readonly select: 'select' extends keyof Mapping ? Mapping[keyof Mapping & 'select'] extends (arg: any) => any ? ReturnType<Mapping[keyof Mapping & 'select']> : Self : Self; readonly update: 'update' extends keyof Mapping ? Mapping[keyof Mapping & 'update'] extends (arg: any) => any ? ReturnType<Mapping[keyof Mapping & 'update']> : Self : Self; readonly json: 'json' extends keyof Mapping ? Mapping[keyof Mapping & 'json'] extends (arg: any) => any ? ReturnType<Mapping[keyof Mapping & 'json']> : Self : Self; readonly jsonCreate: 'jsonCreate' extends keyof Mapping ? Mapping[keyof Mapping & 'jsonCreate'] extends (arg: any) => any ? ReturnType<Mapping[keyof Mapping & 'jsonCreate']> : Self : Self; readonly jsonUpdate: 'jsonUpdate' extends keyof Mapping ? Mapping[keyof Mapping & 'jsonUpdate'] extends (arg: any) => any ? ReturnType<Mapping[keyof Mapping & 'jsonUpdate']> : Self : Self; }>; <Self extends VariantSchema.Field<any> | Schema.Top, const Mapping extends Self extends VariantSchema.Field<infer S extends VariantSchema.Field.Config> ? { readonly [K in keyof S]?: (variant: S[K]) => Schema.Top; } : { readonly insert?: (variant: Self) => Schema.Top; readonly select?: (variant: Self) => Schema.Top; readonly update?: (variant: Self) => Schema.Top; readonly json?: (variant: Self) => Schema.Top; readonly jsonCreate?: (variant: Self) => Schema.Top; readonly jsonUpdate?: (variant: Self) => Schema.Top; }>(self: Self, f: Mapping): VariantSchema.Field<Self extends VariantSchema.Field<infer S extends VariantSchema.Field.Config> ? { readonly [K in keyof S]: K extends keyof Mapping ? Mapping[K] extends (arg: any) => any ? ReturnType<Mapping[K]> : S[K] : S[K]; } : { readonly insert: 'insert' extends keyof Mapping ? Mapping[keyof Mapping & 'insert'] extends (arg: any) => any ? ReturnType<Mapping[keyof Mapping & 'insert']> : Self : Self; readonly select: 'select' extends keyof Mapping ? Mapping[keyof Mapping & 'select'] extends (arg: any) => any ? ReturnType<Mapping[keyof Mapping & 'select']> : Self : Self; readonly update: 'update' extends keyof Mapping ? Mapping[keyof Mapping & 'update'] extends (arg: any) => any ? ReturnType<Mapping[keyof Mapping & 'update']> : Self : Self; readonly json: 'json' extends keyof Mapping ? Mapping[keyof Mapping & 'json'] extends (arg: any) => any ? ReturnType<Mapping[keyof Mapping & 'json']> : Self : Self; readonly jsonCreate: 'jsonCreate' extends keyof Mapping ? Mapping[keyof Mapping & 'jsonCreate'] extends (arg: any) => any ? ReturnType<Mapping[keyof Mapping & 'jsonCreate']> : Self : Self; readonly jsonUpdate: 'jsonUpdate' extends keyof Mapping ? Mapping[keyof Mapping & 'jsonUpdate'] extends (arg: any) => any ? ReturnType<Mapping[keyof Mapping & 'jsonUpdate']> : Self : Self; }>; }`
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.fieldEvolve`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Transforms schemas inside a variant field or plain schema by variant name. Call `Model.fieldEvolve` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/Model.FieldExcept`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:146`
- **Kind / category:** `root-declaration` / `fields`
- **Priority:** **recommended**
- **Current description:** Creates a variant field that applies a schema to every variant except the supplied keys.
- **Signature hint:** `declare function FieldExcept<const Keys extends readonly ('insert' | 'select' | 'update' | 'json' | 'jsonCreate' | 'jsonUpdate')[]>(keys: Keys): <S extends Schema.Top>(schema: S) => VariantSchema.Field<{ readonly [K in Exclude<'insert', Keys[number]> | Exclude<'select', Keys[number]> | Exclude<'update', Keys[number]> | Exclude<'json', Keys[number]> | Exclude<'jsonCreate', Keys[number]> | Exclude<'jsonUpdate', Keys[number]>]: S; }>`
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.FieldExcept`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a variant field that applies a schema to every variant except the supplied keys. Call `Model.FieldExcept` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/Model.FieldOnly`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:153`
- **Kind / category:** `root-declaration` / `fields`
- **Priority:** **recommended**
- **Current description:** Creates a variant field that applies a schema only to the supplied variants.
- **Signature hint:** `declare function FieldOnly<const Keys extends readonly ('insert' | 'select' | 'update' | 'json' | 'jsonCreate' | 'jsonUpdate')[]>(keys: Keys): <S extends Schema.Top>(schema: S) => VariantSchema.Field<{ readonly [K in Keys[number]]: S; }>`
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.FieldOnly`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a variant field that applies a schema only to the supplied variants. Call `Model.FieldOnly` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/Model.GeneratedByDb (value)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:226`
- **Kind / category:** `root-declaration` / `generated`
- **Priority:** **recommended**
- **Current description:** Creates a variant field for a database-generated column available in read variants only.
- **Signature hint:** `declare function GeneratedByDb<S extends Schema.Top>(schema: S): GeneratedByDb<S>`
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.GeneratedByDb`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a variant field for a database-generated column available in read variants only. Call `Model.GeneratedByDb` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/Model.GeneratedByApp (value)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:259`
- **Kind / category:** `root-declaration` / `generated`
- **Priority:** **recommended**
- **Current description:** A field that represents a value generated by the application and present in database variants and the read JSON variant, but omitted from JSON create and update variants.
- **Signature hint:** `declare function GeneratedByApp<S extends Schema.Top>(schema: S): GeneratedByApp<S>`
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.GeneratedByApp`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: A field that represents a value generated by the application and present in database variants and the read JSON variant, but omitted from JSON create and update variants. Call `Model.GeneratedByApp` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/Model.Sensitive (value)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:289`
- **Kind / category:** `root-declaration` / `sensitive`
- **Priority:** **recommended**
- **Current description:** A field that represents a sensitive value that should not be exposed in the JSON variants.
- **Signature hint:** `declare function Sensitive<S extends Schema.Top>(schema: S): Sensitive<S>`
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.Sensitive`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: A field that represents a sensitive value that should not be exposed in the JSON variants. Call `Model.Sensitive` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/Model.optionalOption (value)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:314`
- **Kind / category:** `root-declaration` / `optional`
- **Priority:** **recommended**
- **Current description:** Creates a schema for optional keys that decodes missing or null encoded values through `Option` and encodes `Option` values back to optional nullable keys.
- **Signature hint:** `declare function optionalOption<S extends Schema.Constraint>(schema: S): optionalOption<S>`
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.optionalOption`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a schema for optional keys that decodes missing or null encoded values through `Option` and encodes `Option` values back to optional nullable keys. Call `Model.optionalOption` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/Model.FieldOption (value)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:358`
- **Kind / category:** `root-declaration` / `optional`
- **Priority:** **recommended**
- **Current description:** Converts a field to one that is optional for all variants.
- **Signature hint:** `declare function FieldOption<Field extends VariantSchema.Field<any> | Schema.Top>(self: Field): Field extends Schema.Top ? FieldOption<Field> : Field extends VariantSchema.Field<infer S> ? VariantSchema.Field<{ readonly [K in keyof S]: S[K] extends Schema.Top ? K extends VariantsDatabase ? Schema.OptionFromNullOr<S[K]> : optionalOption<S[K]> : never; }> : never`
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.FieldOption`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Converts a field to one that is optional for all variants. Call `Model.FieldOption` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/Model.BooleanSqlite (value)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:402`
- **Kind / category:** `root-declaration` / `booleans`
- **Priority:** **recommended**
- **Current description:** Schema for sqlite booleans that are represented as `0 | 1` in database variants and `boolean` in JSON variants.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.BooleanSqlite`.
- **Suggested snippet:** Use `Model.BooleanSqlite` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/Model.Date (value)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:427`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **recommended**
- **Current description:** Schema for a `DateTime.Utc` that is serialized as a date string in the format `YYYY-MM-DD`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.Date`.
- **Suggested snippet:** Use `Model.Date` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/Model.DateWithNow`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:441`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **recommended**
- **Current description:** Schema for an overrideable UTC date-only field whose constructor default is the current date with the time component removed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.DateWithNow`.
- **Suggested snippet:** Use `Model.DateWithNow` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/Model.DateTimeWithNow`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:452`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **recommended**
- **Current description:** Schema for an overrideable UTC date-time field encoded as a string and defaulted to the current `DateTime.Utc`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.DateTimeWithNow`.
- **Suggested snippet:** Use `Model.DateTimeWithNow` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/Model.DateTimeFromDateWithNow`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:463`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **recommended**
- **Current description:** Schema for an overrideable UTC date-time field encoded as a JavaScript `Date` and defaulted to the current `DateTime.Utc`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.DateTimeFromDateWithNow`.
- **Suggested snippet:** Use `Model.DateTimeFromDateWithNow` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/Model.DateTimeFromNumberWithNow`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:474`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **recommended**
- **Current description:** Schema for an overrideable UTC date-time field encoded as milliseconds and defaulted to the current `DateTime.Utc`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.DateTimeFromNumberWithNow`.
- **Suggested snippet:** Use `Model.DateTimeFromNumberWithNow` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/Model.JsonFromString (value)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:708`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** A field that represents a JSON value stored as text in the database.
- **Signature hint:** `declare function JsonFromString<S extends Schema.Top>(schema: S): JsonFromString<S>`
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.JsonFromString`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: A field that represents a JSON value stored as text in the database. Call `Model.JsonFromString` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/Model.Uint8Array`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:744`
- **Kind / category:** `root-declaration` / `Uint8Array`
- **Priority:** **recommended**
- **Current description:** Schema for binary `Uint8Array` values backed by an `ArrayBuffer`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.Uint8Array`.
- **Suggested snippet:** Use `Model.Uint8Array` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/Model.UuidV4BytesWithGenerate`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:755`
- **Kind / category:** `root-declaration` / `uuid`
- **Priority:** **recommended**
- **Current description:** Adds a constructor default that generates a binary UUID v4 for a branded `Uint8Array` schema.
- **Signature hint:** `declare function UuidV4BytesWithGenerate<B extends string>(schema: Schema.brand<Schema.instanceOf<Uint8Array<ArrayBuffer>>, B>): Schema.withConstructorDefault<Schema.brand<Schema.instanceOf<Uint8Array<ArrayBuffer>>, B>>`
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.UuidV4BytesWithGenerate`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Adds a constructor default that generates a binary UUID v4 for a branded `Uint8Array` schema. Call `Model.UuidV4BytesWithGenerate` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/Model.UuidV4BytesInsert (value)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:766`
- **Kind / category:** `root-declaration` / `uuid`
- **Priority:** **recommended**
- **Current description:** A field that represents a binary UUID v4 that is generated on inserts.
- **Signature hint:** `declare function UuidV4BytesInsert<const B extends string>(schema: Schema.brand<Schema.instanceOf<Uint8Array<ArrayBuffer>>, B>): UuidV4BytesInsert<B>`
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.UuidV4BytesInsert`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: A field that represents a binary UUID v4 that is generated on inserts. Call `Model.UuidV4BytesInsert` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/Model.UuidV4WithGenerate`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:798`
- **Kind / category:** `root-declaration` / `uuid`
- **Priority:** **recommended**
- **Current description:** Adds a constructor default that generates a string UUID v4.
- **Signature hint:** `declare function UuidV4WithGenerate<B extends string>(schema: Schema.brand<Schema.String, B>): Schema.withConstructorDefault<Schema.brand<Schema.String, B>>`
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.UuidV4WithGenerate`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Adds a constructor default that generates a string UUID v4. Call `Model.UuidV4WithGenerate` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/Model.UuidV4Insert (value)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:809`
- **Kind / category:** `root-declaration` / `uuid`
- **Priority:** **recommended**
- **Current description:** A field that represents a string UUID v4 that is generated on inserts.
- **Signature hint:** `declare function UuidV4Insert<const B extends string>(schema: Schema.brand<Schema.String, B>): UuidV4Insert<B>`
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.UuidV4Insert`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: A field that represents a string UUID v4 that is generated on inserts. Call `Model.UuidV4Insert` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/Model.UuidV7WithGenerate`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:841`
- **Kind / category:** `root-declaration` / `uuid`
- **Priority:** **recommended**
- **Current description:** Adds a constructor default that generates a string UUID v7.
- **Signature hint:** `declare function UuidV7WithGenerate<B extends string>(schema: Schema.brand<Schema.String, B>): Schema.withConstructorDefault<Schema.brand<Schema.String, B>>`
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.UuidV7WithGenerate`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Adds a constructor default that generates a string UUID v7. Call `Model.UuidV7WithGenerate` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/Model.UuidV7Insert (value)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:856`
- **Kind / category:** `root-declaration` / `uuid`
- **Priority:** **recommended**
- **Current description:** A field that represents a string UUID v7 that is generated on inserts.
- **Signature hint:** `declare function UuidV7Insert<const B extends string>(schema: Schema.brand<Schema.String, B>): UuidV7Insert<B>`
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.UuidV7Insert`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: A field that represents a string UUID v7 that is generated on inserts. Call `Model.UuidV7Insert` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/schema/Model.optionalOption (type)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:303`
- **Kind / category:** `root-declaration` / `optional`
- **Priority:** **optional**
- **Current description:** Schema type for an optional object key whose encoded value may be missing or null and whose decoded value is an `Option`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/Model.optionalOption`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.Date (type)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:418`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Schema type for a `DateTime.Utc` date-only value encoded as a `YYYY-MM-DD` string.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/Model.Date`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.Field`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:131`
- **Kind / category:** `root-declaration` / `fields`
- **Priority:** **optional**
- **Current description:** Creates a variant field from schemas keyed by variant name.
- **Signature hint:** `declare const Field: <const A extends VariantSchema.Field.ConfigWithKeys<'insert' | 'select' | 'update' | 'json' | 'jsonCreate' | 'jsonUpdate'>>(config: A & { readonly [K in Exclude<keyof A, 'insert' | 'select' | 'update' | 'json' | 'jsonCreate' | 'jsonUpdate'>]: never; }) => VariantSchema.Field<A>`
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.Field`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a variant field from schemas keyed by variant name. Call `Model.Field` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.Struct`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:160`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a variant struct from model field definitions.
- **Signature hint:** `declare const Struct: <const A extends VariantSchema.Struct.Fields>(fields: A & VariantSchema.Struct.Validate<A, 'insert' | 'select' | 'update' | 'json' | 'jsonCreate' | 'jsonUpdate'>) => VariantSchema.Struct<A>`
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.Struct`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a variant struct from model field definitions. Call `Model.Struct` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.Union`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:168`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a union over the default and generated variant schemas of multiple variant structs.
- **Signature hint:** `declare const Union: <const Members extends ReadonlyArray<VariantSchema.Struct<any>>>(members: Members) => VariantSchema.Union<Members> & VariantSchema.Union.Variants<Members, 'insert' | 'select' | 'update' | 'json' | 'jsonCreate' | 'jsonUpdate'>`
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.Union`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a union over the default and generated variant schemas of multiple variant structs. Call `Model.Union` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.fields`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:177`
- **Kind / category:** `root-declaration` / `fields`
- **Priority:** **optional**
- **Current description:** Returns the variant field definitions stored on a model or variant struct.
- **Signature hint:** `declare function fields<A extends VariantSchema.Struct<any>>(self: A): A[typeof VariantSchema.TypeId]`
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.fields`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns the variant field definitions stored on a model or variant struct. Call `Model.fields` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.Override`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:187`
- **Kind / category:** `root-declaration` / `overrideable`
- **Priority:** **optional**
- **Current description:** Marks a value as an explicit override for fields that otherwise use an overrideable default.
- **Signature hint:** `declare function Override<A>(value: A): A & Brand<'Override'>`
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.Override`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Marks a value as an explicit override for fields that otherwise use an overrideable default. Call `Model.Override` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.GeneratedByDb (type)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:204`
- **Kind / category:** `root-declaration` / `generated`
- **Priority:** **optional**
- **Current description:** Variant field type for a database-generated column that is present in read variants only.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/Model.GeneratedByDb`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.GeneratedByApp (type)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:242`
- **Kind / category:** `root-declaration` / `generated`
- **Priority:** **optional**
- **Current description:** Variant field type for an application-generated value that is present in database variants and read JSON, but omitted from JSON create and update variants.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/Model.GeneratedByApp`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.Sensitive (type)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:274`
- **Kind / category:** `root-declaration` / `sensitive`
- **Priority:** **optional**
- **Current description:** Variant field type for a sensitive value that is available to database variants and omitted from all JSON variants.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/Model.Sensitive`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.FieldOption (type)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:336`
- **Kind / category:** `root-declaration` / `optional`
- **Priority:** **optional**
- **Current description:** Convert a field to one that is optional for all variants.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/Model.FieldOption`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.BooleanSqlite (type)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:384`
- **Kind / category:** `root-declaration` / `booleans`
- **Priority:** **optional**
- **Current description:** Variant field type for SQLite booleans stored as `0 | 1` in database variants and exposed as `boolean` in JSON variants.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/Model.BooleanSqlite`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.DateTimeInsert (type)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:485`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Variant field type for a UTC date-time stored as a string, defaulted to the current time on insert, available for selection, and omitted from updates.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/Model.DateTimeInsert`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.DateTimeInsert (value)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:504`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** A field that represents a date-time value that is inserted as the current `DateTime.Utc`. It is serialized as a string for the database.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.DateTimeInsert`.
- **Suggested snippet:** Use `Model.DateTimeInsert` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.DateTimeInsertFromDate (type)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:517`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Variant field type for a UTC date-time stored as a JavaScript `Date` in database variants, encoded as a string for JSON, and defaulted on insert.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/Model.DateTimeInsertFromDate`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.DateTimeInsertFromDate (value)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:536`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** A field that represents a date-time value that is inserted as the current `DateTime.Utc`. It is serialized as a `Date` for the database.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.DateTimeInsertFromDate`.
- **Suggested snippet:** Use `Model.DateTimeInsertFromDate` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.DateTimeInsertFromNumber (type)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:549`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Variant field type for a UTC date-time encoded as milliseconds and defaulted to the current time on insert.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/Model.DateTimeInsertFromNumber`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.DateTimeInsertFromNumber (value)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:568`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** A field that represents a date-time value that is inserted as the current `DateTime.Utc`. It is serialized as a `number`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.DateTimeInsertFromNumber`.
- **Suggested snippet:** Use `Model.DateTimeInsertFromNumber` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.DateTimeUpdate (type)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:581`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Variant field type for a UTC date-time stored as a string and defaulted to the current time on both inserts and updates.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/Model.DateTimeUpdate`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.DateTimeUpdate (value)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:602`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** A field that represents a date-time value that is updated as the current `DateTime.Utc`. It is serialized as a string for the database.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.DateTimeUpdate`.
- **Suggested snippet:** Use `Model.DateTimeUpdate` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.DateTimeUpdateFromDate (type)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:617`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Variant field type for a UTC date-time stored as a JavaScript `Date` in database variants, encoded as a string for JSON, and defaulted on inserts and updates.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/Model.DateTimeUpdateFromDate`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.DateTimeUpdateFromDate (value)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:638`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** A field that represents a date-time value that is updated as the current `DateTime.Utc`. It is serialized as a `Date` for the database.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.DateTimeUpdateFromDate`.
- **Suggested snippet:** Use `Model.DateTimeUpdateFromDate` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.DateTimeUpdateFromNumber (type)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:652`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Variant field type for a UTC date-time encoded as milliseconds and defaulted to the current time on both inserts and updates.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/Model.DateTimeUpdateFromNumber`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.DateTimeUpdateFromNumber (value)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:673`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** A field that represents a date-time value that is updated as the current `DateTime.Utc`. It is serialized as a `number`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Model } from "effect/unstable/schema"` and use `Model.DateTimeUpdateFromNumber`.
- **Suggested snippet:** Use `Model.DateTimeUpdateFromNumber` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.UuidV4BytesInsert (type)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:729`
- **Kind / category:** `root-declaration` / `uuid`
- **Priority:** **optional**
- **Current description:** Variant field type for a branded binary UUID v4 value whose insert variant generates a UUID by default.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/Model.UuidV4BytesInsert`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.UuidV4Insert (type)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:783`
- **Kind / category:** `root-declaration` / `uuid`
- **Priority:** **optional**
- **Current description:** Variant field type for a branded string UUID v4 value whose insert variant generates a UUID by default.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/Model.UuidV4Insert`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.UuidV7Insert (type)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:826`
- **Kind / category:** `root-declaration` / `uuid`
- **Priority:** **optional**
- **Current description:** Variant field type for a branded string UUID v7 value whose insert variant generates a UUID by default.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/Model.UuidV7Insert`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.Any`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:46`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Base shape of a variant model schema, including its fields and the generated database and JSON variant schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/Model.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.VariantsDatabase`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:61`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Database-facing variant names generated for model schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/Model.VariantsDatabase`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.VariantsJson`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:69`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** JSON API-facing variant names generated for model schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/Model.VariantsJson`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/Model.JsonFromString (type)`

- **Source:** `packages/effect/src/unstable/schema/Model.ts:687`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Variant field type for a JSON value stored as text in database variants and exposed through the supplied schema in JSON variants.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/Model.JsonFromString`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
