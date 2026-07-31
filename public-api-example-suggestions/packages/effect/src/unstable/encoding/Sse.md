# Example Suggestions: `effect/unstable/encoding/Sse`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/encoding/Sse.ts`
- **Uncovered API records:** 27
- **Priorities:** 0 required, 9 recommended, 16 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                       | Line | Kind               | Priority        |
| --------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/encoding/Sse.EventTooLarge`              |   34 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Sse.SseError`                   |   56 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Sse.decode`                     |  102 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Sse.decodeSchema`               |  175 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Sse.makeParser`                 |  250 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Sse.encode`                     |  444 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Sse.encodeSchema`               |  478 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Sse.decodeDataSchema`           |  209 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Sse.encoder`                    |  654 | `root-declaration` | **recommended** |
| `effect/unstable/encoding/Sse.SseErrorReason`             |   48 | `root-declaration` | **optional**    |
| `effect/unstable/encoding/Sse.DecodeOptions`              |   82 | `root-declaration` | **optional**    |
| `effect/unstable/encoding/Sse.EventCodec`                 |  151 | `root-declaration` | **optional**    |
| `effect/unstable/encoding/Sse.Parser`                     |  428 | `root-declaration` | **optional**    |
| `effect/unstable/encoding/Sse.Encoder`                    |  504 | `root-declaration` | **optional**    |
| `effect/unstable/encoding/Sse.SseError.message`           |   71 | `member`           | **optional**    |
| `effect/unstable/encoding/Sse.DecodeOptions.maxEventSize` |   86 | `member`           | **optional**    |
| `effect/unstable/encoding/Sse.Event (type) (type)`        |  514 | `root-declaration` | **optional**    |
| `effect/unstable/encoding/Sse.EventEncoded (type) (type)` |  527 | `root-declaration` | **optional**    |
| `effect/unstable/encoding/Sse.Event (type) (type)`        |  543 | `root-declaration` | **optional**    |
| `effect/unstable/encoding/Sse.transformEvent`             |  562 | `root-declaration` | **optional**    |
| `effect/unstable/encoding/Sse.EventEncoded (type) (type)` |  587 | `root-declaration` | **optional**    |
| `effect/unstable/encoding/Sse.Retry`                      |  606 | `root-declaration` | **optional**    |
| `effect/unstable/encoding/Sse.Retry.is`                   |  621 | `member`           | **optional**    |
| `effect/unstable/encoding/Sse.Retry.filter`               |  629 | `member`           | **optional**    |
| `effect/unstable/encoding/Sse.AnyEvent`                   |  641 | `root-declaration` | **optional**    |
| `effect/unstable/encoding/Sse.SseError.SseErrorTypeId`    |   64 | `member`           | **discouraged** |
| `effect/unstable/encoding/Sse.Retry.RetryTypeId`          |  615 | `member`           | **discouraged** |

## Recommended

### `effect/unstable/encoding/Sse.EventTooLarge`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:34`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error reason raised when pending Server-Sent Events state exceeds the configured maximum size.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Sse } from "effect/unstable/encoding"` and use `Sse.EventTooLarge`.
- **Suggested snippet:** Create or capture `Sse.EventTooLarge` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Sse.SseError`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:56`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error raised when decoding a Server-Sent Events stream fails.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Sse } from "effect/unstable/encoding"` and use `Sse.SseError`.
- **Suggested snippet:** Create or capture `Sse.SseError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Sse.decode`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:102`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **recommended**
- **Current description:** Creates a channel that parses Server-Sent Events text chunks into `Event` values.
- **Signature hint:** `declare function decode<IE, Done>(options?: DecodeOptions): Channel.Channel<NonEmptyReadonlyArray<Event>, IE | Retry | SseError, Done, NonEmptyReadonlyArray<string>, IE, Done>`
- **Import guidance:** Start from `import { Sse } from "effect/unstable/encoding"` and use `Sse.decode`.
- **Suggested snippet:** Create a finite Channel, apply `Sse.decode`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Sse.decodeSchema`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:175`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **recommended**
- **Current description:** Creates an SSE decoder channel that decodes each parsed event with a schema.
- **Signature hint:** `declare function decodeSchema<S extends EventCodec, IE, Done>(schema: S, options?: DecodeOptions): Channel.Channel<NonEmptyReadonlyArray<S['Type']>, IE | Retry | SseError | Schema.SchemaError, Done, NonEmptyReadonlyArray<string>, IE, Done, S['DecodingServices']>`
- **Import guidance:** Start from `import { Sse } from "effect/unstable/encoding"` and use `Sse.decodeSchema`.
- **Suggested snippet:** Create a finite Channel, apply `Sse.decodeSchema`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Sse.makeParser`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:250`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **recommended**
- **Current description:** Creates a stateful Server-Sent Events parser.
- **Signature hint:** `declare function makeParser(onParse: (event: AnyEvent) => void, options?: DecodeOptions): Parser`
- **Import guidance:** Start from `import { Sse } from "effect/unstable/encoding"` and use `Sse.makeParser`.
- **Suggested snippet:** Construct one representative value with `Sse.makeParser`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Sse.encode`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:444`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Creates a channel that encodes `Event` values as Server-Sent Events text.
- **Signature hint:** `declare function encode<IE, Done>(): Channel.Channel<NonEmptyReadonlyArray<string>, IE, void, NonEmptyReadonlyArray<Event>, IE | Retry, Done>`
- **Import guidance:** Start from `import { Sse } from "effect/unstable/encoding"` and use `Sse.encode`.
- **Suggested snippet:** Create a finite Channel, apply `Sse.encode`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Sse.encodeSchema`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:478`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Creates an SSE encoder channel for values accepted by a schema.
- **Signature hint:** `declare function encodeSchema<S extends EventCodec, IE, Done>(schema: S): Channel.Channel<NonEmptyReadonlyArray<string>, IE | Schema.SchemaError, void, NonEmptyReadonlyArray<S['Type']>, IE | Retry, Done, S['EncodingServices']>`
- **Import guidance:** Start from `import { Sse } from "effect/unstable/encoding"` and use `Sse.encodeSchema`.
- **Suggested snippet:** Create a finite Channel, apply `Sse.encodeSchema`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Sse.decodeDataSchema`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:209`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **recommended**
- **Current description:** Creates an SSE decoder channel that JSON-decodes each event `data` field with a schema.
- **Signature hint:** `declare function decodeDataSchema<Type, DecodingServices, IE, Done>(schema: Schema.ConstraintDecoder<Type, DecodingServices>, options?: DecodeOptions): Channel.Channel<NonEmptyReadonlyArray<{ readonly event: string; readonly id: string | undefined; readonly data: Type; }>, IE | Retry | SseError | Schema.SchemaError, Done, NonEmptyReadonlyArray<string>, IE, Done, DecodingServices>`
- **Import guidance:** Start from `import { Sse } from "effect/unstable/encoding"` and use `Sse.decodeDataSchema`.
- **Suggested snippet:** Create a finite Channel, apply `Sse.decodeDataSchema`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/encoding/Sse.encoder`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:654`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Default Server-Sent Events encoder.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Sse } from "effect/unstable/encoding"` and use `Sse.encoder`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Sse.encoder`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/encoding/Sse.SseErrorReason`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:48`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **optional**
- **Current description:** Union of Server-Sent Events decoding error reasons.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/encoding/Sse.SseErrorReason`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/encoding/Sse.DecodeOptions`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:82`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Options for decoding Server-Sent Events streams.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/encoding/Sse.DecodeOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/encoding/Sse.EventCodec`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:151`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** A constraint for schemas that can decode SSE events.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/encoding/Sse.EventCodec`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/encoding/Sse.Parser`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:428`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Stateful Server-Sent Events parser returned by `makeParser`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/encoding/Sse.Parser`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/encoding/Sse.Encoder`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:504`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **optional**
- **Current description:** Encoder capable of rendering an `Event` or `Retry` value as Server-Sent Events text.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/encoding/Sse.Encoder`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/encoding/Sse.SseError.message`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:71`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Delegates the public message to the underlying SSE error reason.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/encoding/Sse.SseError.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/encoding/Sse.DecodeOptions.maxEventSize`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:86`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Maximum number of string code units retained for a pending event. The default is 10 MiB.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/encoding/Sse.DecodeOptions.maxEventSize` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/encoding/Sse.Event (type) (type)`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:514`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Tagged model for a Server-Sent Events message containing the event name, optional event ID, and string data payload.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/encoding/Sse.Event (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/encoding/Sse.EventEncoded (type) (type)`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:527`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Schema for the untagged Server-Sent Events payload shape containing an optional `id`, `event`, and string `data` fields.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Sse } from "effect/unstable/encoding"` and use `Sse.EventEncoded`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Sse.EventEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/encoding/Sse.Event (type) (type)`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:543`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Schema for the tagged Server-Sent Events message model that adds `_tag: "Event"` to the event name, optional event ID, and string data payload.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Sse } from "effect/unstable/encoding"` and use `Sse.Event`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Sse.Event`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/encoding/Sse.transformEvent`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:562`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Schema for transforming untagged SSE event payloads into tagged `Event` models.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Sse } from "effect/unstable/encoding"` and use `Sse.transformEvent`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Sse.transformEvent`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/encoding/Sse.EventEncoded (type) (type)`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:587`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Untagged Server-Sent Events payload shape containing the event name, optional event ID, and string data payload.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/encoding/Sse.EventEncoded (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/encoding/Sse.Retry`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:606`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a Server-Sent Events retry directive.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Sse } from "effect/unstable/encoding"` and use `Sse.Retry`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Sse.Retry`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/encoding/Sse.Retry.is`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:621`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns `true` when the value is an SSE retry directive.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/encoding/Sse.Retry.is` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/encoding/Sse.Retry.filter`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:629`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Separates SSE retry directives from regular event values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/encoding/Sse.Retry.filter` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/encoding/Sse.AnyEvent`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:641`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Union of SSE values that can be rendered by an `Encoder`: regular events and retry directives.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/encoding/Sse.AnyEvent`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/encoding/Sse.SseError.SseErrorTypeId`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:64`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as an SSE decoding error.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/encoding/Sse.SseError.SseErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/encoding/Sse.Retry.RetryTypeId`

- **Source:** `packages/effect/src/unstable/encoding/Sse.ts:615`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as an SSE retry directive for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/encoding/Sse.Retry.RetryTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
