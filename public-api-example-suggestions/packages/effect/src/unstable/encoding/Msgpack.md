# Example Suggestions: `effect/unstable/encoding/Msgpack`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/encoding/Msgpack.ts`
- **Uncovered API records:** 12
- **Priorities:** 0 required, 9 recommended, 2 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                | Line | Kind               | Priority        |
| ------------------------------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/unstable/encoding/Msgpack.MsgPackError`                    |   40 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Msgpack.encode`                          |   72 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Msgpack.encodeSchema`                    |  104 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Msgpack.decode`                          |  128 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Msgpack.decodeSchema`                    |  184 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Msgpack.duplex`                          |  208 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Msgpack.duplexSchema`                    |  245 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Msgpack.transformation`                  |  343 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Msgpack.schema (value)`                  |  382 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Msgpack.schema (type)`                   |  328 | `root-declaration` | **optional**    |
| `effect/unstable/encoding/Msgpack.MsgPackError.message`            |   56 | `member`           | **optional**    |
| `effect/unstable/encoding/Msgpack.MsgPackError.MsgPackErrorTypeId` |   49 | `member`           | **discouraged** |

## Recommended

### `effect/unstable/encoding/Msgpack.MsgPackError`

- **Source:** `packages/effect/src/unstable/encoding/Msgpack.ts:40`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error raised when MessagePack encoding or decoding fails.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Msgpack } from "effect/unstable/encoding"` and use `Msgpack.MsgPackError`.
- **Suggested snippet:** Create or capture `Msgpack.MsgPackError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Msgpack.encode`

- **Source:** `packages/effect/src/unstable/encoding/Msgpack.ts:72`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a channel that encodes non-empty chunks of values as MessagePack byte arrays.
- **Signature hint:** `declare function encode<IE = never, Done = unknown>(): Channel.Channel<Arr.NonEmptyReadonlyArray<Uint8Array<ArrayBuffer>>, IE | MsgPackError, Done, Arr.NonEmptyReadonlyArray<unknown>, IE, Done>`
- **Import guidance:** Start from `import { Msgpack } from "effect/unstable/encoding"` and use `Msgpack.encode`.
- **Suggested snippet:** Create a finite Channel, apply `Msgpack.encode`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Msgpack.encodeSchema`

- **Source:** `packages/effect/src/unstable/encoding/Msgpack.ts:104`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a MessagePack encoder channel for values of a schema.
- **Signature hint:** `declare function encodeSchema<S extends Schema.Constraint>(schema: S): <IE = never, Done = unknown>() => Channel.Channel<Arr.NonEmptyReadonlyArray<Uint8Array<ArrayBuffer>>, MsgPackError | Schema.SchemaError | IE, Done, Arr.NonEmptyReadonlyArray<S['Type']>, IE, Done, S['EncodingServices']>`
- **Import guidance:** Start from `import { Msgpack } from "effect/unstable/encoding"` and use `Msgpack.encodeSchema`.
- **Suggested snippet:** Create a finite Channel, apply `Msgpack.encodeSchema`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Msgpack.decode`

- **Source:** `packages/effect/src/unstable/encoding/Msgpack.ts:128`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a channel that decodes MessagePack byte chunks into values.
- **Signature hint:** `declare function decode<IE = never, Done = unknown>(): Channel.Channel<Arr.NonEmptyReadonlyArray<unknown>, IE | MsgPackError, Done, Arr.NonEmptyReadonlyArray<Uint8Array<ArrayBuffer>>, IE, Done>`
- **Import guidance:** Start from `import { Msgpack } from "effect/unstable/encoding"` and use `Msgpack.decode`.
- **Suggested snippet:** Create a finite Channel, apply `Msgpack.decode`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Msgpack.decodeSchema`

- **Source:** `packages/effect/src/unstable/encoding/Msgpack.ts:184`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a MessagePack decoder channel for values of a schema.
- **Signature hint:** `declare function decodeSchema<S extends Schema.Constraint>(schema: S): <IE = never, Done = unknown>() => Channel.Channel<Arr.NonEmptyReadonlyArray<S['Type']>, Schema.SchemaError | MsgPackError | IE, Done, Arr.NonEmptyReadonlyArray<Uint8Array<ArrayBuffer>>, IE, Done, S['DecodingServices']>`
- **Import guidance:** Start from `import { Msgpack } from "effect/unstable/encoding"` and use `Msgpack.decodeSchema`.
- **Suggested snippet:** Create a finite Channel, apply `Msgpack.decodeSchema`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Msgpack.duplex`

- **Source:** `packages/effect/src/unstable/encoding/Msgpack.ts:208`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Wraps a bidirectional byte channel with MessagePack encoding and decoding.
- **Signature hint:** `declare function duplex<R, IE, OE, OutDone, InDone>(self: Channel.Channel<Arr.NonEmptyReadonlyArray<Uint8Array<ArrayBuffer>>, OE, OutDone, Arr.NonEmptyReadonlyArray<Uint8Array<ArrayBuffer>>, IE | MsgPackError, InDone, R>): Channel.Channel<Arr.NonEmptyReadonlyArray<unknown>, MsgPackError | OE, OutDone, Arr.NonEmptyReadonlyArray<unknown>, IE, InDone, R>`
- **Import guidance:** Start from `import { Msgpack } from "effect/unstable/encoding"` and use `Msgpack.duplex`.
- **Suggested snippet:** Create a finite Channel, apply `Msgpack.duplex`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Msgpack.duplexSchema`

- **Source:** `packages/effect/src/unstable/encoding/Msgpack.ts:245`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Wraps a bidirectional byte channel with schema-aware MessagePack encoding and decoding.
- **Signature hint:** `declare function duplexSchema<In extends Schema.Constraint, Out extends Schema.Constraint>(options: { readonly inputSchema: In; readonly outputSchema: Out; }): <OutErr, OutDone, InErr, InDone, R>(self: Channel.Channel<Arr.NonEmptyReadonlyArray<Uint8Array<ArrayBuffer>>, OutErr, OutDone, Arr.NonEmptyReadonlyArray<Uint8Array<ArrayBuffer>>, MsgPackError | Schema.SchemaError | InErr, InDone, R>) => Channel.Channel<Arr.NonEmptyReadonlyArray<Out['Type']>, MsgPackError | Schema.SchemaError | OutErr, OutDone, Arr.NonEmptyReadonlyArray<In['Type']>, InErr, InDone, R | In['EncodingServices'] | Out['DecodingServices']> declare function duplexSchema<Out extends Schema.Constraint, In extends Schema.Constraint, OutErr, OutDone, InErr, InDone, R>(self: Channel.Channel<Arr.NonEmptyReadonlyArray<Uint8Array<ArrayBuffer>>, OutErr, OutDone, Arr.NonEmptyReadonlyArray<Uint8Array<ArrayBuffer>>, MsgPackError | Schema.SchemaError | InErr, InDone, R>, options: { readonly inputSchema: In; readonly outputSchema: Out; }): Channel.Channel<Arr.NonEmptyReadonlyArray<Out['Type']>, MsgPackError | Schema.SchemaError | OutErr, OutDone, Arr.NonEmptyReadonlyArray<In['Type']>, InErr, InDone, R | In['EncodingServices'] | Out['DecodingServices']>`
- **Import guidance:** Start from `import { Msgpack } from "effect/unstable/encoding"` and use `Msgpack.duplexSchema`.
- **Suggested snippet:** Create a finite Channel, apply `Msgpack.duplexSchema`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Msgpack.transformation`

- **Source:** `packages/effect/src/unstable/encoding/Msgpack.ts:343`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for decoding MessagePack bytes into values and encoding values back to MessagePack bytes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Msgpack } from "effect/unstable/encoding"` and use `Msgpack.transformation`.
- **Suggested snippet:** Use `Msgpack.transformation` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Msgpack.schema (value)`

- **Source:** `packages/effect/src/unstable/encoding/Msgpack.ts:382`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Builds a schema that stores values as MessagePack bytes.
- **Signature hint:** `declare function schema<S extends Schema.Constraint>(schema: S): schema<S>`
- **Import guidance:** Start from `import { Msgpack } from "effect/unstable/encoding"` and use `Msgpack.schema`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Builds a schema that stores values as MessagePack bytes. Call `Msgpack.schema` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/encoding/Msgpack.schema (type)`

- **Source:** `packages/effect/src/unstable/encoding/Msgpack.ts:328`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema type for values encoded as MessagePack bytes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/encoding/Msgpack.schema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/encoding/Msgpack.MsgPackError.message`

- **Source:** `packages/effect/src/unstable/encoding/Msgpack.ts:56`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Uses the failed MessagePack operation as the public message.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/encoding/Msgpack.MsgPackError.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/encoding/Msgpack.MsgPackError.MsgPackErrorTypeId`

- **Source:** `packages/effect/src/unstable/encoding/Msgpack.ts:49`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a MessagePack encoding or decoding error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/encoding/Msgpack.MsgPackError.MsgPackErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
