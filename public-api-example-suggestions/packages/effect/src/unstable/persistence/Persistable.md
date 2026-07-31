# Example Suggestions: `effect/unstable/persistence/Persistable`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/persistence/Persistable.ts`
- **Uncovered API records:** 15
- **Priorities:** 0 required, 4 recommended, 10 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                        | Line | Kind               | Priority        |
| ---------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/persistence/Persistable.Class`            |  142 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/Persistable.exitSchema`       |  209 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/Persistable.serializeExit`    |  228 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/Persistable.deserializeExit`  |  243 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/Persistable.Persistable`      |   41 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Persistable.Any`              |   54 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Persistable.SuccessSchema`    |   62 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Persistable.Success`          |   70 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Persistable.ErrorSchema`      |   78 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Persistable.Error`            |   86 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Persistable.DecodingServices` |   95 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Persistable.EncodingServices` |  105 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Persistable.Services`         |  116 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Persistable.TimeToLiveFn`     |  129 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Persistable.symbol`           |   32 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/persistence/Persistable.Class`

- **Source:** `packages/effect/src/unstable/persistence/Persistable.ts:142`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates request classes that implement `Persistable` and `Request.Request`.
- **Signature hint:** `declare function Class<Config extends { payload: Record<string, unknown>; requires?: any; requestError?: any; } = { payload: {}; }>(): <const Tag extends string, A extends Schema.Constraint = Schema.Void, E extends Schema.Constraint = Schema.Never>(tag: Tag, options: { readonly primaryKey: (payload: Config['payload']) => string; readonly success?: A | undefined; readonly error?: E | undefined; }) => new (args: Types.EqualsWith<Config['payload'], {}, void, { readonly [P in keyof Config['payload'] as P extends '_tag' ? never : P]: Config['payload'][P]; }>) => { readonly _tag: Tag; } & { readonly [K in keyof Config['payload']]: Config['payload'][K]; } & Persistable<A, E> & Request.Request<A['Type'], E['Type'] | ('requestError' extends keyof Config ? Config['requestError'] : (PersistenceError | Schema.SchemaError)), A['DecodingServices'] | A['EncodingServices'] | E['DecodingServices'] | E['EncodingServices'] | ('requires' extends keyof Config ? Config['requires'] : never)>`
- **Import guidance:** Start from `import { Persistable } from "effect/unstable/persistence"` and use `Persistable.Class`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates request classes that implement `Persistable` and `Request.Request`. Call `Persistable.Class` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/Persistable.exitSchema`

- **Source:** `packages/effect/src/unstable/persistence/Persistable.ts:209`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Returns the cached `Exit` schema for a persistable request's success and error schemas.
- **Signature hint:** `declare function exitSchema<A extends Schema.Constraint, E extends Schema.Constraint>(self: Persistable<A, E>): Schema.Exit<A, E, Schema.Defect>`
- **Import guidance:** Start from `import { Persistable } from "effect/unstable/persistence"` and use `Persistable.exitSchema`.
- **Suggested snippet:** Define the smallest domain Schema involving `Persistable.exitSchema`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/Persistable.serializeExit`

- **Source:** `packages/effect/src/unstable/persistence/Persistable.ts:228`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **recommended**
- **Current description:** Encodes an `Exit` for a persistable request using its success and error schemas.
- **Signature hint:** `declare function serializeExit<A extends Schema.Constraint, E extends Schema.Constraint>(self: Persistable<A, E>, exit: Exit.Exit<A['Type'], E['Type']>): Effect.Effect<unknown, Schema.SchemaError, A['EncodingServices'] | E['EncodingServices']>`
- **Import guidance:** Start from `import { Persistable } from "effect/unstable/persistence"` and use `Persistable.serializeExit`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Persistable.serializeExit`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/Persistable.deserializeExit`

- **Source:** `packages/effect/src/unstable/persistence/Persistable.ts:243`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **recommended**
- **Current description:** Decodes a persisted value into an `Exit` for a persistable request using its success and error schemas.
- **Signature hint:** `declare function deserializeExit<A extends Schema.Constraint, E extends Schema.Constraint>(self: Persistable<A, E>, encoded: unknown): Effect.Effect<Exit.Exit<A['Type'], E['Type']>, Schema.SchemaError, A['DecodingServices'] | E['DecodingServices']>`
- **Import guidance:** Start from `import { Persistable } from "effect/unstable/persistence"` and use `Persistable.deserializeExit`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Persistable.deserializeExit`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/persistence/Persistable.Persistable`

- **Source:** `packages/effect/src/unstable/persistence/Persistable.ts:41`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A primary-keyed request value whose success and error results can be serialized for persistence.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/Persistable.Persistable`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/Persistable.Any`

- **Source:** `packages/effect/src/unstable/persistence/Persistable.ts:54`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Any persistable request regardless of its success and error schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/Persistable.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/Persistable.SuccessSchema`

- **Source:** `packages/effect/src/unstable/persistence/Persistable.ts:62`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the success schema from a persistable request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/Persistable.SuccessSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/Persistable.Success`

- **Source:** `packages/effect/src/unstable/persistence/Persistable.ts:70`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the success value type from a persistable request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/Persistable.Success`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/Persistable.ErrorSchema`

- **Source:** `packages/effect/src/unstable/persistence/Persistable.ts:78`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the error schema from a persistable request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/Persistable.ErrorSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/Persistable.Error`

- **Source:** `packages/effect/src/unstable/persistence/Persistable.ts:86`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the error value type from a persistable request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/Persistable.Error`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/Persistable.DecodingServices`

- **Source:** `packages/effect/src/unstable/persistence/Persistable.ts:95`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Services required to decode a persisted success or error value for the request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/Persistable.DecodingServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/Persistable.EncodingServices`

- **Source:** `packages/effect/src/unstable/persistence/Persistable.ts:105`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Services required to encode a success or error value for persistence.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/Persistable.EncodingServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/Persistable.Services`

- **Source:** `packages/effect/src/unstable/persistence/Persistable.ts:116`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** All schema services required to encode and decode a persistable request result.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/Persistable.Services`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/Persistable.TimeToLiveFn`

- **Source:** `packages/effect/src/unstable/persistence/Persistable.ts:129`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes the time to live for a persisted result from the result `Exit` and request value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/Persistable.TimeToLiveFn`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/persistence/Persistable.symbol`

- **Source:** `packages/effect/src/unstable/persistence/Persistable.ts:32`
- **Kind / category:** `root-declaration` / `symbols`
- **Priority:** **discouraged**
- **Current description:** Defines the property key used to attach success and error schemas to persistable requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Persistable } from "effect/unstable/persistence"` and use `Persistable.symbol`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Persistable.symbol` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
