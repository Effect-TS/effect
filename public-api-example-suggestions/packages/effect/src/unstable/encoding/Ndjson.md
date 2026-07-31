# Example Suggestions: `effect/unstable/encoding/Ndjson`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/encoding/Ndjson.ts`
- **Uncovered API records:** 15
- **Priorities:** 0 required, 11 recommended, 3 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                             | Line | Kind               | Priority        |
| --------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/encoding/Ndjson.NdjsonError`                   |   33 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Ndjson.encode`                        |   89 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Ndjson.encodeSchema`                  |  109 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Ndjson.encodeSchemaString`            |  133 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Ndjson.decode`                        |  201 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Ndjson.decodeSchema`                  |  225 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Ndjson.decodeSchemaString`            |  251 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Ndjson.duplex`                        |  277 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Ndjson.duplexString`                  |  359 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Ndjson.duplexSchema`                  |  442 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Ndjson.duplexSchemaString`            |  529 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Ndjson.encodeString`                  |   65 | `root-declaration` | **optional**    |
| `effect/unstable/encoding/Ndjson.decodeString`                  |  166 | `root-declaration` | **optional**    |
| `effect/unstable/encoding/Ndjson.NdjsonError.message`           |   49 | `member`           | **optional**    |
| `effect/unstable/encoding/Ndjson.NdjsonError.NdjsonErrorTypeId` |   42 | `member`           | **discouraged** |

## Recommended

### `effect/unstable/encoding/Ndjson.NdjsonError`

- **Source:** `packages/effect/src/unstable/encoding/Ndjson.ts:33`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error raised when NDJSON encoding or decoding fails.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Ndjson } from "effect/unstable/encoding"` and use `Ndjson.NdjsonError`.
- **Suggested snippet:** Create or capture `Ndjson.NdjsonError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Ndjson.encode`

- **Source:** `packages/effect/src/unstable/encoding/Ndjson.ts:89`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a channel that encodes chunks of values as UTF-8 NDJSON bytes.
- **Signature hint:** `declare function encode<IE = never, Done = unknown>(): Channel.Channel<Arr.NonEmptyReadonlyArray<Uint8Array>, IE | NdjsonError, Done, Arr.NonEmptyReadonlyArray<unknown>, IE, Done>`
- **Import guidance:** Start from `import { Ndjson } from "effect/unstable/encoding"` and use `Ndjson.encode`.
- **Suggested snippet:** Create a finite Channel, apply `Ndjson.encode`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Ndjson.encodeSchema`

- **Source:** `packages/effect/src/unstable/encoding/Ndjson.ts:109`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an NDJSON byte encoder channel for values of a schema.
- **Signature hint:** `declare function encodeSchema<S extends Schema.Constraint>(schema: S): <IE = never, Done = unknown>() => Channel.Channel<Arr.NonEmptyReadonlyArray<Uint8Array>, NdjsonError | Schema.SchemaError | IE, Done, Arr.NonEmptyReadonlyArray<S['Type']>, IE, Done, S['EncodingServices']>`
- **Import guidance:** Start from `import { Ndjson } from "effect/unstable/encoding"` and use `Ndjson.encodeSchema`.
- **Suggested snippet:** Create a finite Channel, apply `Ndjson.encodeSchema`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Ndjson.encodeSchemaString`

- **Source:** `packages/effect/src/unstable/encoding/Ndjson.ts:133`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an NDJSON string encoder channel for values of a schema.
- **Signature hint:** `declare function encodeSchemaString<S extends Schema.Constraint>(schema: S): <IE = never, Done = unknown>() => Channel.Channel<Arr.NonEmptyReadonlyArray<string>, NdjsonError | Schema.SchemaError | IE, Done, Arr.NonEmptyReadonlyArray<S['Type']>, IE, Done, S['EncodingServices']>`
- **Import guidance:** Start from `import { Ndjson } from "effect/unstable/encoding"` and use `Ndjson.encodeSchemaString`.
- **Suggested snippet:** Create a finite Channel, apply `Ndjson.encodeSchemaString`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Ndjson.decode`

- **Source:** `packages/effect/src/unstable/encoding/Ndjson.ts:201`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a channel that decodes UTF-8 byte chunks and parses them as NDJSON.
- **Signature hint:** `declare function decode<IE = never, Done = unknown>(options?: { readonly ignoreEmptyLines?: boolean | undefined; }): Channel.Channel<Arr.NonEmptyReadonlyArray<unknown>, IE | NdjsonError, Done, Arr.NonEmptyReadonlyArray<Uint8Array>, IE, Done>`
- **Import guidance:** Start from `import { Ndjson } from "effect/unstable/encoding"` and use `Ndjson.decode`.
- **Suggested snippet:** Create a finite Channel, apply `Ndjson.decode`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Ndjson.decodeSchema`

- **Source:** `packages/effect/src/unstable/encoding/Ndjson.ts:225`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an NDJSON byte decoder channel for values of a schema.
- **Signature hint:** `declare function decodeSchema<S extends Schema.Constraint>(schema: S): <IE = never, Done = unknown>(options?: { readonly ignoreEmptyLines?: boolean | undefined; }) => Channel.Channel<Arr.NonEmptyReadonlyArray<S['Type']>, Schema.SchemaError | NdjsonError | IE, Done, Arr.NonEmptyReadonlyArray<Uint8Array>, IE, Done, S['DecodingServices']>`
- **Import guidance:** Start from `import { Ndjson } from "effect/unstable/encoding"` and use `Ndjson.decodeSchema`.
- **Suggested snippet:** Create a finite Channel, apply `Ndjson.decodeSchema`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Ndjson.decodeSchemaString`

- **Source:** `packages/effect/src/unstable/encoding/Ndjson.ts:251`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an NDJSON string decoder channel for values of a schema.
- **Signature hint:** `declare function decodeSchemaString<S extends Schema.Constraint>(schema: S): <IE = never, Done = unknown>(options?: { readonly ignoreEmptyLines?: boolean | undefined; }) => Channel.Channel<Arr.NonEmptyReadonlyArray<S['Type']>, Schema.SchemaError | NdjsonError | IE, Done, Arr.NonEmptyReadonlyArray<string>, IE, Done, S['DecodingServices']>`
- **Import guidance:** Start from `import { Ndjson } from "effect/unstable/encoding"` and use `Ndjson.decodeSchemaString`.
- **Suggested snippet:** Create a finite Channel, apply `Ndjson.decodeSchemaString`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Ndjson.duplex`

- **Source:** `packages/effect/src/unstable/encoding/Ndjson.ts:277`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Wraps a bidirectional byte channel with NDJSON encoding and decoding.
- **Signature hint:** `declare function duplex(options?: { readonly ignoreEmptyLines?: boolean | undefined; }): <R, IE, OE, OutDone, InDone>(self: Channel.Channel<Arr.NonEmptyReadonlyArray<Uint8Array>, OE, OutDone, Arr.NonEmptyReadonlyArray<Uint8Array>, IE | NdjsonError, InDone, R>) => Channel.Channel<Arr.NonEmptyReadonlyArray<unknown>, NdjsonError | OE, OutDone, Arr.NonEmptyReadonlyArray<unknown>, IE, InDone, R> declare function duplex<R, IE, OE, OutDone, InDone>(self: Channel.Channel<Arr.NonEmptyReadonlyArray<Uint8Array>, OE, OutDone, Arr.NonEmptyReadonlyArray<Uint8Array>, IE | NdjsonError, InDone, R>, options?: { readonly ignoreEmptyLines?: boolean | undefined; }): Channel.Channel<Arr.NonEmptyReadonlyArray<unknown>, NdjsonError | OE, OutDone, Arr.NonEmptyReadonlyArray<unknown>, IE, InDone, R>`
- **Import guidance:** Start from `import { Ndjson } from "effect/unstable/encoding"` and use `Ndjson.duplex`.
- **Suggested snippet:** Create a finite Channel, apply `Ndjson.duplex`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Ndjson.duplexString`

- **Source:** `packages/effect/src/unstable/encoding/Ndjson.ts:359`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Wraps a bidirectional string channel with NDJSON encoding and decoding.
- **Signature hint:** `declare function duplexString(options?: { readonly ignoreEmptyLines?: boolean | undefined; }): <R, IE, OE, OutDone, InDone>(self: Channel.Channel<Arr.NonEmptyReadonlyArray<string>, OE, OutDone, Arr.NonEmptyReadonlyArray<string>, IE | NdjsonError, InDone, R>) => Channel.Channel<Arr.NonEmptyReadonlyArray<unknown>, NdjsonError | OE, OutDone, Arr.NonEmptyReadonlyArray<unknown>, IE, InDone, R> declare function duplexString<R, IE, OE, OutDone, InDone>(self: Channel.Channel<Arr.NonEmptyReadonlyArray<string>, OE, OutDone, Arr.NonEmptyReadonlyArray<string>, IE | NdjsonError, InDone, R>, options?: { readonly ignoreEmptyLines?: boolean | undefined; }): Channel.Channel<Arr.NonEmptyReadonlyArray<unknown>, NdjsonError | OE, OutDone, Arr.NonEmptyReadonlyArray<unknown>, IE, InDone, R>`
- **Import guidance:** Start from `import { Ndjson } from "effect/unstable/encoding"` and use `Ndjson.duplexString`.
- **Suggested snippet:** Create a finite Channel, apply `Ndjson.duplexString`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Ndjson.duplexSchema`

- **Source:** `packages/effect/src/unstable/encoding/Ndjson.ts:442`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Wraps a bidirectional byte channel with schema-aware NDJSON encoding and decoding.
- **Signature hint:** `declare function duplexSchema<In extends Schema.Constraint, Out extends Schema.Constraint>(options: { readonly inputSchema: In; readonly outputSchema: Out; readonly ignoreEmptyLines?: boolean | undefined; }): <OutErr, OutDone, InErr, InDone, R>(self: Channel.Channel<Arr.NonEmptyReadonlyArray<Uint8Array>, OutErr, OutDone, Arr.NonEmptyReadonlyArray<Uint8Array>, NdjsonError | Schema.SchemaError | InErr, InDone, R>) => Channel.Channel<Arr.NonEmptyReadonlyArray<Out['Type']>, NdjsonError | Schema.SchemaError | OutErr, OutDone, Arr.NonEmptyReadonlyArray<In['Type']>, InErr, InDone, R | In['EncodingServices'] | Out['DecodingServices']> declare function duplexSchema<Out extends Schema.Constraint, In extends Schema.Constraint, OutErr, OutDone, InErr, InDone, R>(self: Channel.Channel<Arr.NonEmptyReadonlyArray<Uint8Array>, OutErr, OutDone, Arr.NonEmptyReadonlyArray<Uint8Array>, NdjsonError | Schema.SchemaError | InErr, InDone, R>, options: { readonly inputSchema: In; readonly outputSchema: Out; readonly ignoreEmptyLines?: boolean | undefined; }): Channel.Channel<Arr.NonEmptyReadonlyArray<Out['Type']>, NdjsonError | Schema.SchemaError | OutErr, OutDone, Arr.NonEmptyReadonlyArray<In['Type']>, InErr, InDone, R | In['EncodingServices'] | Out['DecodingServices']>`
- **Import guidance:** Start from `import { Ndjson } from "effect/unstable/encoding"` and use `Ndjson.duplexSchema`.
- **Suggested snippet:** Create a finite Channel, apply `Ndjson.duplexSchema`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Ndjson.duplexSchemaString`

- **Source:** `packages/effect/src/unstable/encoding/Ndjson.ts:529`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Wraps a bidirectional string channel with schema-aware NDJSON encoding and decoding.
- **Signature hint:** `declare function duplexSchemaString<In extends Schema.Constraint, Out extends Schema.Constraint>(options: { readonly inputSchema: In; readonly outputSchema: Out; readonly ignoreEmptyLines?: boolean | undefined; }): <OutErr, OutDone, InErr, InDone, R>(self: Channel.Channel<Arr.NonEmptyReadonlyArray<string>, OutErr, OutDone, Arr.NonEmptyReadonlyArray<string>, NdjsonError | Schema.SchemaError | InErr, InDone, R>) => Channel.Channel<Arr.NonEmptyReadonlyArray<Out['Type']>, NdjsonError | Schema.SchemaError | OutErr, OutDone, Arr.NonEmptyReadonlyArray<In['Type']>, InErr, InDone, R | In['EncodingServices'] | Out['DecodingServices']> declare function duplexSchemaString<Out extends Schema.Constraint, In extends Schema.Constraint, OutErr, OutDone, InErr, InDone, R>(self: Channel.Channel<Arr.NonEmptyReadonlyArray<string>, OutErr, OutDone, Arr.NonEmptyReadonlyArray<string>, NdjsonError | Schema.SchemaError | InErr, InDone, R>, options: { readonly inputSchema: In; readonly outputSchema: Out; readonly ignoreEmptyLines?: boolean | undefined; }): Channel.Channel<Arr.NonEmptyReadonlyArray<Out['Type']>, NdjsonError | Schema.SchemaError | OutErr, OutDone, Arr.NonEmptyReadonlyArray<In['Type']>, InErr, InDone, R | In['EncodingServices'] | Out['DecodingServices']>`
- **Import guidance:** Start from `import { Ndjson } from "effect/unstable/encoding"` and use `Ndjson.duplexSchemaString`.
- **Suggested snippet:** Create a finite Channel, apply `Ndjson.duplexSchemaString`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/encoding/Ndjson.encodeString`

- **Source:** `packages/effect/src/unstable/encoding/Ndjson.ts:65`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a channel that encodes chunks of values as NDJSON strings.
- **Signature hint:** `declare function encodeString<IE = never, Done = unknown>(): Channel.Channel<Arr.NonEmptyReadonlyArray<string>, IE | NdjsonError, Done, Arr.NonEmptyReadonlyArray<unknown>, IE, Done>`
- **Import guidance:** Start from `import { Ndjson } from "effect/unstable/encoding"` and use `Ndjson.encodeString`.
- **Suggested snippet:** Create a finite Channel, apply `Ndjson.encodeString`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/encoding/Ndjson.decodeString`

- **Source:** `packages/effect/src/unstable/encoding/Ndjson.ts:166`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a channel that parses NDJSON string chunks into values.
- **Signature hint:** `declare function decodeString<IE = never, Done = unknown>(options?: { readonly ignoreEmptyLines?: boolean | undefined; }): Channel.Channel<Arr.NonEmptyReadonlyArray<unknown>, IE | NdjsonError, Done, Arr.NonEmptyReadonlyArray<string>, IE, Done>`
- **Import guidance:** Start from `import { Ndjson } from "effect/unstable/encoding"` and use `Ndjson.decodeString`.
- **Suggested snippet:** Create a finite Channel, apply `Ndjson.decodeString`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/encoding/Ndjson.NdjsonError.message`

- **Source:** `packages/effect/src/unstable/encoding/Ndjson.ts:49`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Uses the failed NDJSON operation as the public message.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/encoding/Ndjson.NdjsonError.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/encoding/Ndjson.NdjsonError.NdjsonErrorTypeId`

- **Source:** `packages/effect/src/unstable/encoding/Ndjson.ts:42`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as an NDJSON encoding or decoding error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/encoding/Ndjson.NdjsonError.NdjsonErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
