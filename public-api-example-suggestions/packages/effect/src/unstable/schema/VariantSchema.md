# Example Suggestions: `effect/unstable/schema/VariantSchema`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts`
- **Uncovered API records:** 25
- **Priorities:** 0 required, 6 recommended, 18 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                         | Line | Kind                    | Priority        |
| ----------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/schema/VariantSchema.isStruct`             |   49 | `root-declaration`      | **recommended** |
| `effect/unstable/schema/VariantSchema.isField`              |  113 | `root-declaration`      | **recommended** |
| `effect/unstable/schema/VariantSchema.fields`               |  251 | `root-declaration`      | **recommended** |
| `effect/unstable/schema/VariantSchema.make`                 |  335 | `root-declaration`      | **recommended** |
| `effect/unstable/schema/VariantSchema.Override`             |  512 | `root-declaration`      | **recommended** |
| `effect/unstable/schema/VariantSchema.Overrideable (value)` |  549 | `root-declaration`      | **recommended** |
| `effect/unstable/schema/VariantSchema.ExtractFields`        |  173 | `root-declaration`      | **optional**    |
| `effect/unstable/schema/VariantSchema.Extract`              |  192 | `root-declaration`      | **optional**    |
| `effect/unstable/schema/VariantSchema.Overrideable (type)`  |  521 | `root-declaration`      | **optional**    |
| `effect/unstable/schema/VariantSchema.Struct (type) (type)` |   37 | `root-declaration`      | **optional**    |
| `effect/unstable/schema/VariantSchema.Struct (type) (type)` |   56 | `namespace`             | **optional**    |
| `effect/unstable/schema/VariantSchema.Struct.Any`           |   63 | `namespace-declaration` | **optional**    |
| `effect/unstable/schema/VariantSchema.Struct.Fields`        |   72 | `namespace-declaration` | **optional**    |
| `effect/unstable/schema/VariantSchema.Struct.Validate`      |   87 | `namespace-declaration` | **optional**    |
| `effect/unstable/schema/VariantSchema.Field (type) (type)`  |  102 | `root-declaration`      | **optional**    |
| `effect/unstable/schema/VariantSchema.Field (type) (type)`  |  120 | `namespace`             | **optional**    |
| `effect/unstable/schema/VariantSchema.Field.Any`            |  127 | `namespace-declaration` | **optional**    |
| `effect/unstable/schema/VariantSchema.Field.Config`         |  135 | `namespace-declaration` | **optional**    |
| `effect/unstable/schema/VariantSchema.Field.ConfigWithKeys` |  146 | `namespace-declaration` | **optional**    |
| `effect/unstable/schema/VariantSchema.Field.Fields`         |  157 | `namespace-declaration` | **optional**    |
| `effect/unstable/schema/VariantSchema.Class`                |  260 | `root-declaration`      | **optional**    |
| `effect/unstable/schema/VariantSchema.Union (type) (type)`  |  299 | `root-declaration`      | **optional**    |
| `effect/unstable/schema/VariantSchema.Union (type) (type)`  |  312 | `namespace`             | **optional**    |
| `effect/unstable/schema/VariantSchema.Union.Variants`       |  319 | `namespace-declaration` | **optional**    |
| `effect/unstable/schema/VariantSchema.TypeId`               |   26 | `root-declaration`      | **discouraged** |

## Recommended

### `effect/unstable/schema/VariantSchema.isStruct`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:49`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is a variant schema struct.
- **Signature hint:** `declare function isStruct(u: unknown): u is Struct<any>`
- **Import guidance:** Start from `import { VariantSchema } from "effect/unstable/schema"` and use `VariantSchema.isStruct`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `VariantSchema.isStruct` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/VariantSchema.isField`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:113`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is a variant schema field.
- **Signature hint:** `declare function isField(u: unknown): u is Field<any>`
- **Import guidance:** Start from `import { VariantSchema } from "effect/unstable/schema"` and use `VariantSchema.isField`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `VariantSchema.isField` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/VariantSchema.fields`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:251`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Returns the original field definitions stored on a variant schema struct.
- **Signature hint:** `declare function fields<A extends Struct<any>>(self: A): A[typeof TypeId]`
- **Import guidance:** Start from `import { VariantSchema } from "effect/unstable/schema"` and use `VariantSchema.fields`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns the original field definitions stored on a variant schema struct. Call `VariantSchema.fields` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/VariantSchema.make`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:335`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a variant schema toolkit for a fixed set of variant names and a default variant.
- **Signature hint:** `declare function make<const Variants extends ReadonlyArray<string>, const Default extends Variants[number]>(options: { readonly variants: Variants; readonly defaultVariant: Default; }): { readonly Struct: <const A extends Struct.Fields>(fields: A & Struct.Validate<A, Variants[number]>) => Struct<A>; readonly Field: <const A extends Field.ConfigWithKeys<Variants[number]>>(config: A & { readonly [K in Exclude<keyof A, Variants[number]>]: never; }) => Field<A>; readonly FieldOnly: <const Keys extends ReadonlyArray<Variants[number]>>(keys: Keys) => <S extends Schema.Top>(schema: S) => Field<{ readonly [K in Keys[number]]: S; }>; readonly FieldExcept: <const Keys extends ReadonlyArray<Variants[number]>>(keys: Keys) => <S extends Schema.Top>(schema: S) => Field<{ readonly [K in Exclude<Variants[number], Keys[number]>]: S; }>; readonly fieldEvolve: { <Self extends Field<any> | Schema.Top, const Mapping extends (Self extends Field<infer S> ? { readonly [K in keyof S]?: (variant: S[K]) => Schema.Top; } : { readonly [K in Variants[number]]?: (variant: Self) => Schema.Top; })>(f: Mapping): (self: Self) => Field<Self extends Field<infer S> ? { readonly [K in keyof S]: K extends keyof Mapping ? Mapping[K] extends (arg: any) => any ? ReturnType<Mapping[K]> : S[K] : S[K]; } : { readonly [K in Variants[number]]: K extends keyof Mapping ? Mapping[K] extends (arg: any) => any ? ReturnType<Mapping[K]> : Self : Self; }>; <Self extends Field<any> | Schema.Top, const Mapping extends (Self extends Field<infer S> ? { readonly [K in keyof S]?: (variant: S[K]) => Schema.Top; } : { readonly [K in Variants[number]]?: (variant: Self) => Schema.Top; })>(self: Self, f: Mapping): Field<Self extends Field<infer S> ? { readonly [K in keyof S]: K extends keyof Mapping ? Mapping[K] extends (arg: any) => any ? ReturnType<Mapping[K]> : S[K] : S[K]; } : { readonly [K in Variants[number]]: K extends keyof Mapping ? Mapping[K] extends (arg: any) => any ? ReturnType<Mapping[K]> : Self : Self; }>; }; readonly Class: <Self = never>(identifier: string) => <const Fields extends Struct.Fields>(fields: Fields & Struct.Validate<Fields, Variants[number]>, annotations?: Schema.Annotations.Declaration<Self, readonly [Schema.Struct<ExtractFields<Default, Fields, true>>]> | undefined) => [Self] extends [never] ? MissingSelfGeneric : Class<Self, Fields, Schema.Struct<ExtractFields<Default, Fields, true>>> & { readonly [V in Variants[number]]: Extract<V, Struct<Fields>>; }; readonly Union: <const Members extends ReadonlyArray<Struct<any>>>(members: Members) => Union<Members> & Union.Variants<Members, Variants[number]>; readonly extract: { <V extends Variants[number]>(variant: V): <A extends Struct<any>>(self: A) => Extract<V, A, V extends Default ? true : false>; <V extends Variants[number], A extends Struct<any>>(self: A, variant: V): Extract<V, A, V extends Default ? true : false>; }; }`
- **Import guidance:** Start from `import { VariantSchema } from "effect/unstable/schema"` and use `VariantSchema.make`.
- **Suggested snippet:** Construct one representative value with `VariantSchema.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/VariantSchema.Override`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:512`
- **Kind / category:** `root-declaration` / `overrideable`
- **Priority:** **recommended**
- **Current description:** Marks a value as an explicit override for an `Overrideable` schema default.
- **Signature hint:** `declare function Override<A>(value: A): A & Brand<'Override'>`
- **Import guidance:** Start from `import { VariantSchema } from "effect/unstable/schema"` and use `VariantSchema.Override`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Marks a value as an explicit override for an `Overrideable` schema default. Call `VariantSchema.Override` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/schema/VariantSchema.Overrideable (value)`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:549`
- **Kind / category:** `root-declaration` / `overrideable`
- **Priority:** **recommended**
- **Current description:** Wraps a schema with an effectful constructor default while allowing explicit values to be marked with `Override`.
- **Signature hint:** `declare function Overrideable<S extends Schema.Top & Schema.WithoutConstructorDefault>(schema: S, options: { readonly defaultValue: Effect.Effect<S['~type.make.in']>; }): Overrideable<S>`
- **Import guidance:** Start from `import { VariantSchema } from "effect/unstable/schema"` and use `VariantSchema.Overrideable`.
- **Suggested snippet:** Define the smallest domain Schema involving `VariantSchema.Overrideable`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/schema/VariantSchema.ExtractFields`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:173`
- **Kind / category:** `root-declaration` / `extractors`
- **Priority:** **optional**
- **Current description:** Computes the `Schema.Struct` field map for a variant by selecting matching field schemas and recursively extracting nested structs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/VariantSchema.ExtractFields`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/VariantSchema.Extract`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:192`
- **Kind / category:** `root-declaration` / `extractors`
- **Priority:** **optional**
- **Current description:** Computes the schema type produced by extracting a single variant from a variant schema struct.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/VariantSchema.Extract`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/VariantSchema.Overrideable (type)`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:521`
- **Kind / category:** `root-declaration` / `overrideable`
- **Priority:** **optional**
- **Current description:** Schema type whose constructor can use an effectful default unless a value is explicitly branded with `Override`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/VariantSchema.Overrideable`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/VariantSchema.Struct (type) (type)`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:37`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Pipeable container of schema fields that can be extracted into per-variant `Schema.Struct` schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/VariantSchema.Struct (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/VariantSchema.Struct (type) (type)`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:56`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Type-level helpers for variant schema structs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/VariantSchema.Struct (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/VariantSchema.Struct.Any`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:63`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Minimal structural type for any variant schema struct.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/VariantSchema.Struct.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/VariantSchema.Struct.Fields`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:72`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Field map accepted by a variant struct, where each property may be a schema, a variant field, a nested struct, or `undefined`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/VariantSchema.Struct.Fields`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/VariantSchema.Struct.Validate`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:87`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level validation that every variant field in a struct only uses variants from the configured variant set.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/VariantSchema.Struct.Validate`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/VariantSchema.Field (type) (type)`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:102`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Pipeable collection of variant-specific schemas for a single logical field.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/VariantSchema.Field (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/VariantSchema.Field (type) (type)`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:120`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Type-level helpers for variant schema fields.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/VariantSchema.Field (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/VariantSchema.Field.Any`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:127`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Minimal structural type for any variant schema field.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/VariantSchema.Field.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/VariantSchema.Field.Config`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:135`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Map from variant name to the schema used for a field in that variant.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/VariantSchema.Field.Config`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/VariantSchema.Field.ConfigWithKeys`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:146`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Variant field configuration restricted to an optional subset of the supplied variant keys.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/VariantSchema.Field.ConfigWithKeys`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/VariantSchema.Field.Fields`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:157`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Field map whose properties may be schemas, variant fields, nested structs, or `undefined`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/VariantSchema.Field.Fields`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/VariantSchema.Class`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:260`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Schema class type returned by variant class constructors, combining the default variant schema with access to the original variant fields.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/VariantSchema.Class`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/VariantSchema.Union (type) (type)`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:299`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Union schema over the default schemas of a list of variant schema structs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/VariantSchema.Union (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/VariantSchema.Union (type) (type)`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:312`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Type-level helpers for unions of variant schema structs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/VariantSchema.Union (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/schema/VariantSchema.Union.Variants`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:319`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes a union schema for each variant from a list of variant schema structs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/schema/VariantSchema.Union.Variants`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/schema/VariantSchema.TypeId`

- **Source:** `packages/effect/src/unstable/schema/VariantSchema.ts:26`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier attached to variant schema structs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { VariantSchema } from "effect/unstable/schema"` and use `VariantSchema.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `VariantSchema.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
