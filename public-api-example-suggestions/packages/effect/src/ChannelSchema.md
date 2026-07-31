# Example Suggestions: `effect/ChannelSchema`

- **Package:** `effect`
- **Source:** `packages/effect/src/ChannelSchema.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 6 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                  | Line | Kind               | Priority        |
| ------------------------------------ | ---: | ------------------ | --------------- |
| `effect/ChannelSchema.encode`        |   36 | `root-declaration` | **recommended** |
| `effect/ChannelSchema.encodeUnknown` |   66 | `root-declaration` | **recommended** |
| `effect/ChannelSchema.decode`        |   98 | `root-declaration` | **recommended** |
| `effect/ChannelSchema.decodeUnknown` |  133 | `root-declaration` | **recommended** |
| `effect/ChannelSchema.duplex`        |  168 | `root-declaration` | **recommended** |
| `effect/ChannelSchema.duplexUnknown` |  262 | `root-declaration` | **recommended** |

## Recommended

### `effect/ChannelSchema.encode`

- **Source:** `packages/effect/src/ChannelSchema.ts:36`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a channel that encodes non-empty chunks of schema values into the schema's encoded representation.
- **Signature hint:** `declare function encode<S extends Schema.Constraint>(schema: S): <IE = never, Done = unknown>() => Channel.Channel<Arr.NonEmptyReadonlyArray<S['Encoded']>, IE | Schema.SchemaError, Done, Arr.NonEmptyReadonlyArray<S['Type']>, IE, Done, S['EncodingServices']>`
- **Import guidance:** Start from `import { ChannelSchema } from "effect"` and use `ChannelSchema.encode`.
- **Suggested snippet:** Create a finite Channel, apply `ChannelSchema.encode`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ChannelSchema.encodeUnknown`

- **Source:** `packages/effect/src/ChannelSchema.ts:66`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an `encode` channel variant whose encoded output chunks are typed as `unknown`.
- **Signature hint:** `declare function encodeUnknown<S extends Schema.Constraint>(schema: S): <IE = never, Done = unknown>() => Channel.Channel<Arr.NonEmptyReadonlyArray<unknown>, IE | Schema.SchemaError, Done, Arr.NonEmptyReadonlyArray<S['Type']>, IE, Done, S['EncodingServices']>`
- **Import guidance:** Start from `import { ChannelSchema } from "effect"` and use `ChannelSchema.encodeUnknown`.
- **Suggested snippet:** Create a finite Channel, apply `ChannelSchema.encodeUnknown`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ChannelSchema.decode`

- **Source:** `packages/effect/src/ChannelSchema.ts:98`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a channel that decodes non-empty chunks from the schema's encoded representation into schema values.
- **Signature hint:** `declare function decode<S extends Schema.Constraint>(schema: S): <IE = never, Done = unknown>() => Channel.Channel<Arr.NonEmptyReadonlyArray<S['Type']>, IE | Schema.SchemaError, Done, Arr.NonEmptyReadonlyArray<S['Encoded']>, IE, Done, S['DecodingServices']>`
- **Import guidance:** Start from `import { ChannelSchema } from "effect"` and use `ChannelSchema.decode`.
- **Suggested snippet:** Create a finite Channel, apply `ChannelSchema.decode`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ChannelSchema.decodeUnknown`

- **Source:** `packages/effect/src/ChannelSchema.ts:133`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `decode` channel variant for schema-decoding channel boundaries.
- **Signature hint:** `declare function decodeUnknown<S extends Schema.Constraint>(schema: S): <IE = never, Done = unknown>() => Channel.Channel<Arr.NonEmptyReadonlyArray<S['Type']>, IE | Schema.SchemaError, Done, Arr.NonEmptyReadonlyArray<S['Encoded']>, IE, Done, S['DecodingServices']>`
- **Import guidance:** Start from `import { ChannelSchema } from "effect"` and use `ChannelSchema.decodeUnknown`.
- **Suggested snippet:** Create a finite Channel, apply `ChannelSchema.decodeUnknown`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ChannelSchema.duplex`

- **Source:** `packages/effect/src/ChannelSchema.ts:168`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Wraps a channel so callers work with typed input and output chunks while the wrapped channel uses encoded chunks.
- **Signature hint:** `declare function duplex<In extends Schema.Constraint, Out extends Schema.Constraint>(options: { readonly inputSchema: In; readonly outputSchema: Out; }): <OutErr, OutDone, InErr, InDone, R>(self: Channel.Channel<Arr.NonEmptyReadonlyArray<Out['Encoded']>, OutErr, OutDone, Arr.NonEmptyReadonlyArray<In['Encoded']>, Schema.SchemaError | InErr, InDone, R>) => Channel.Channel<Arr.NonEmptyReadonlyArray<Out['Type']>, Schema.SchemaError | OutErr, OutDone, Arr.NonEmptyReadonlyArray<In['Type']>, InErr, InDone, R | In['EncodingServices'] | Out['DecodingServices']> declare function duplex<Out extends Schema.Constraint, OutErr, OutDone, In extends Schema.Constraint, InErr, InDone, R>(self: Channel.Channel<Arr.NonEmptyReadonlyArray<Out['Encoded']>, OutErr, OutDone, Arr.NonEmptyReadonlyArray<In['Encoded']>, Schema.SchemaError | InErr, InDone, R>, options: { readonly inputSchema: In; readonly outputSchema: Out; }): Channel.Channel<Arr.NonEmptyReadonlyArray<Out['Type']>, Schema.SchemaError | OutErr, OutDone, Arr.NonEmptyReadonlyArray<In['Type']>, InErr, InDone, R | In['EncodingServices'] | Out['DecodingServices']>`
- **Import guidance:** Start from `import { ChannelSchema } from "effect"` and use `ChannelSchema.duplex`.
- **Suggested snippet:** Create a finite Channel, apply `ChannelSchema.duplex`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ChannelSchema.duplexUnknown`

- **Source:** `packages/effect/src/ChannelSchema.ts:262`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Wraps a bidirectional channel whose encoded chunks are typed as `unknown`.
- **Signature hint:** `declare function duplexUnknown<In extends Schema.Constraint, Out extends Schema.Constraint>(options: { readonly inputSchema: In; readonly outputSchema: Out; }): <OutErr, OutDone, InErr, InDone, R>(self: Channel.Channel<Arr.NonEmptyReadonlyArray<unknown>, OutErr, OutDone, Arr.NonEmptyReadonlyArray<any>, Schema.SchemaError | InErr, InDone, R>) => Channel.Channel<Arr.NonEmptyReadonlyArray<Out['Type']>, Schema.SchemaError | OutErr, OutDone, Arr.NonEmptyReadonlyArray<In['Type']>, InErr, InDone, R | In['EncodingServices'] | Out['DecodingServices']> declare function duplexUnknown<Out extends Schema.Constraint, OutErr, OutDone, In extends Schema.Constraint, InErr, InDone, R>(self: Channel.Channel<Arr.NonEmptyReadonlyArray<unknown>, OutErr, OutDone, Arr.NonEmptyReadonlyArray<any>, Schema.SchemaError | InErr, InDone, R>, options: { readonly inputSchema: In; readonly outputSchema: Out; }): Channel.Channel<Arr.NonEmptyReadonlyArray<Out['Type']>, Schema.SchemaError | OutErr, OutDone, Arr.NonEmptyReadonlyArray<In['Type']>, InErr, InDone, R | In['EncodingServices'] | Out['DecodingServices']>`
- **Import guidance:** Start from `import { ChannelSchema } from "effect"` and use `ChannelSchema.duplexUnknown`.
- **Suggested snippet:** Create a finite Channel, apply `ChannelSchema.duplexUnknown`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
