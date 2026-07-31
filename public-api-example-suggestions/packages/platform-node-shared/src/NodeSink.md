# Example Suggestions: `@effect/platform-node-shared/NodeSink`

- **Package:** `@effect/platform-node-shared`
- **Source:** `packages/platform-node-shared/src/NodeSink.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 3 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                         | Line | Kind               | Priority        |
| ----------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-node-shared/NodeSink.fromWritable`        |   29 | `root-declaration` | **recommended** |
| `@effect/platform-node-shared/NodeSink.fromWritableChannel` |   47 | `root-declaration` | **recommended** |
| `@effect/platform-node-shared/NodeSink.pullIntoWritable`    |   76 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-node-shared/NodeSink.fromWritable`

- **Source:** `packages/platform-node-shared/src/NodeSink.ts:29`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Sink` that writes chunks to a Node writable stream, respecting backpressure, mapping writable errors with `onError`, and ending the stream on completion unless `endOnDone` is `false`.
- **Signature hint:** `declare function fromWritable<E, A = string | Uint8Array<ArrayBufferLike>>(options: { readonly evaluate: LazyArg<Writable | NodeJS.WritableStream>; readonly onError: (error: unknown) => E; readonly endOnDone?: boolean | undefined; readonly encoding?: BufferEncoding | undefined; }): Sink.Sink<void, A, never, E>`
- **Import guidance:** Start from `import { NodeSink } from "@effect/platform-node-shared"` and use `NodeSink.fromWritable`.
- **Suggested snippet:** Convert one representative external input with `NodeSink.fromWritable` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node-shared/NodeSink.fromWritableChannel`

- **Source:** `packages/platform-node-shared/src/NodeSink.ts:47`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Channel` that pulls chunks from upstream and writes them to a Node writable stream, respecting backpressure and optionally ending the writable when upstream is done.
- **Signature hint:** `declare function fromWritableChannel<IE, E, A = string | Uint8Array<ArrayBufferLike>>(options: { readonly evaluate: LazyArg<Writable | NodeJS.WritableStream>; readonly onError: (error: unknown) => E; readonly endOnDone?: boolean | undefined; readonly encoding?: BufferEncoding | undefined; }): Channel.Channel<never, IE | E, void, NonEmptyReadonlyArray<A>, IE>`
- **Import guidance:** Start from `import { NodeSink } from "@effect/platform-node-shared"` and use `NodeSink.fromWritableChannel`.
- **Suggested snippet:** Create a finite Channel, apply `NodeSink.fromWritableChannel`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node-shared/NodeSink.pullIntoWritable`

- **Source:** `packages/platform-node-shared/src/NodeSink.ts:76`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Writes Effect chunks into a Node writable stream.
- **Signature hint:** `declare function pullIntoWritable<A, IE, E>(options: { readonly pull: Pull.Pull<NonEmptyReadonlyArray<A>, IE, unknown>; readonly writable: Writable; readonly onError: (error: unknown) => E; readonly endOnDone?: boolean | undefined; readonly encoding?: BufferEncoding | undefined; }): Pull.Pull<never, IE | E, unknown>`
- **Import guidance:** Start from `import { NodeSink } from "@effect/platform-node-shared"` and use `NodeSink.pullIntoWritable`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Writes Effect chunks into a Node writable stream. Call `NodeSink.pullIntoWritable` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
