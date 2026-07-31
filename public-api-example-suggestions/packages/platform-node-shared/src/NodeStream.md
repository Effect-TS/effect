# Example Suggestions: `@effect/platform-node-shared/NodeStream`

- **Package:** `@effect/platform-node-shared`
- **Source:** `packages/platform-node-shared/src/NodeStream.ts`
- **Uncovered API records:** 10
- **Priorities:** 2 required, 8 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                           | Line | Kind               | Priority        |
| ------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-node-shared/NodeStream.toString`            |  217 | `root-declaration` | **required**    |
| `@effect/platform-node-shared/NodeStream.toArrayBuffer`       |  270 | `root-declaration` | **required**    |
| `@effect/platform-node-shared/NodeStream.fromReadable`        |   38 | `root-declaration` | **recommended** |
| `@effect/platform-node-shared/NodeStream.fromReadableChannel` |   54 | `root-declaration` | **recommended** |
| `@effect/platform-node-shared/NodeStream.fromDuplex`          |   78 | `root-declaration` | **recommended** |
| `@effect/platform-node-shared/NodeStream.pipeThroughDuplex`   |  124 | `root-declaration` | **recommended** |
| `@effect/platform-node-shared/NodeStream.pipeThroughSimple`   |  169 | `root-declaration` | **recommended** |
| `@effect/platform-node-shared/NodeStream.toReadable`          |  190 | `root-declaration` | **recommended** |
| `@effect/platform-node-shared/NodeStream.toReadableNever`     |  203 | `root-declaration` | **recommended** |
| `@effect/platform-node-shared/NodeStream.toUint8Array`        |  320 | `root-declaration` | **recommended** |

## Required

### `@effect/platform-node-shared/NodeStream.toString`

- **Source:** `packages/platform-node-shared/src/NodeStream.ts:217`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **required**
- **Current description:** Consumes a Node readable stream into a string using the selected encoding, failing through `onError` on stream errors or when `maxBytes` is exceeded and destroying the stream on interruption or failure.
- **Signature hint:** `declare function toString<E = Cause.UnknownError>(readable: LazyArg<Readable | NodeJS.ReadableStream>, options?: { readonly onError?: (error: unknown) => E; readonly encoding?: BufferEncoding | undefined; readonly maxBytes?: SizeInput | undefined; }): Effect.Effect<string, E>`
- **Import guidance:** Start from `import { NodeStream } from "@effect/platform-node-shared"` and use `NodeStream.toString`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `NodeStream.toString`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

### `@effect/platform-node-shared/NodeStream.toArrayBuffer`

- **Source:** `packages/platform-node-shared/src/NodeStream.ts:270`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **required**
- **Current description:** Consumes a Node readable stream into an `ArrayBuffer`, failing through `onError` on stream errors or when `maxBytes` is exceeded and destroying the stream on interruption or failure.
- **Signature hint:** `declare function toArrayBuffer<E = Cause.UnknownError>(readable: LazyArg<Readable | NodeJS.ReadableStream>, options?: { readonly onError?: (error: unknown) => E; readonly maxBytes?: SizeInput | undefined; }): Effect.Effect<ArrayBuffer, E>`
- **Import guidance:** Start from `import { NodeStream } from "@effect/platform-node-shared"` and use `NodeStream.toArrayBuffer`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `NodeStream.toArrayBuffer`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

## Recommended

### `@effect/platform-node-shared/NodeStream.fromReadable`

- **Source:** `packages/platform-node-shared/src/NodeStream.ts:38`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Converts a Node readable stream into an Effect `Stream`, reading chunks with an optional chunk size, mapping stream errors with `onError`, and destroying the readable on completion unless `closeOnDone` is `false`.
- **Signature hint:** `declare function fromReadable<A = Uint8Array<ArrayBufferLike>, E = Cause.UnknownError>(options: { readonly evaluate: LazyArg<Readable | NodeJS.ReadableStream>; readonly onError?: (error: unknown) => E; readonly chunkSize?: number | undefined; readonly bufferSize?: number | undefined; readonly closeOnDone?: boolean | undefined; }): Stream.Stream<A, E>`
- **Import guidance:** Start from `import { NodeStream } from "@effect/platform-node-shared"` and use `NodeStream.fromReadable`.
- **Suggested snippet:** Create a finite stream, apply `NodeStream.fromReadable`, consume it with `Stream.runCollect` or `Stream.runForEach`, and assert the stable ordering, cardinality, or failure behavior. Bound any potentially infinite stream first.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node-shared/NodeStream.fromReadableChannel`

- **Source:** `packages/platform-node-shared/src/NodeStream.ts:54`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Channel` that pulls chunks from a Node readable stream, mapping errors with `onError` and destroying the readable on completion unless `closeOnDone` is `false`.
- **Signature hint:** `declare function fromReadableChannel<A = Uint8Array<ArrayBufferLike>, E = Cause.UnknownError>(options: { readonly evaluate: LazyArg<Readable | NodeJS.ReadableStream>; readonly onError?: (error: unknown) => E; readonly chunkSize?: number | undefined; readonly closeOnDone?: boolean | undefined; }): Channel.Channel<Arr.NonEmptyReadonlyArray<A>, E>`
- **Import guidance:** Start from `import { NodeStream } from "@effect/platform-node-shared"` and use `NodeStream.fromReadableChannel`.
- **Suggested snippet:** Create a finite Channel, apply `NodeStream.fromReadableChannel`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node-shared/NodeStream.fromDuplex`

- **Source:** `packages/platform-node-shared/src/NodeStream.ts:78`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Channel` over a Node `Duplex`, writing upstream chunks with backpressure while emitting chunks read from the duplex and optionally ending the writable side when upstream completes.
- **Signature hint:** `declare function fromDuplex<IE, I = Uint8Array<ArrayBufferLike>, O = Uint8Array<ArrayBufferLike>, E = Cause.UnknownError>(options: { readonly evaluate: LazyArg<Duplex>; readonly onError?: (error: unknown) => E; readonly chunkSize?: number | undefined; readonly bufferSize?: number | undefined; readonly endOnDone?: boolean | undefined; readonly encoding?: BufferEncoding | undefined; }): Channel.Channel<Arr.NonEmptyReadonlyArray<O>, IE | E, void, Arr.NonEmptyReadonlyArray<I>, IE>`
- **Import guidance:** Start from `import { NodeStream } from "@effect/platform-node-shared"` and use `NodeStream.fromDuplex`.
- **Suggested snippet:** Create a finite Channel, apply `NodeStream.fromDuplex`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node-shared/NodeStream.pipeThroughDuplex`

- **Source:** `packages/platform-node-shared/src/NodeStream.ts:124`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Pipes an Effect `Stream` through a Node `Duplex`, writing the stream's chunks to the duplex and emitting chunks read back from it.
- **Signature hint:** `declare function pipeThroughDuplex<B = Uint8Array<ArrayBufferLike>, E2 = Cause.UnknownError>(options: { readonly evaluate: LazyArg<Duplex>; readonly onError?: (error: unknown) => E2; readonly chunkSize?: number | undefined; readonly bufferSize?: number | undefined; readonly endOnDone?: boolean | undefined; readonly encoding?: BufferEncoding | undefined; }): <R, E, A>(self: Stream.Stream<A, E, R>) => Stream.Stream<B, E2 | E, R> declare function pipeThroughDuplex<R, E, A, B = Uint8Array<ArrayBufferLike>, E2 = Cause.UnknownError>(self: Stream.Stream<A, E, R>, options: { readonly evaluate: LazyArg<Duplex>; readonly onError?: (error: unknown) => E2; readonly chunkSize?: number | undefined; readonly bufferSize?: number | undefined; readonly endOnDone?: boolean | undefined; readonly encoding?: BufferEncoding | undefined; }): Stream.Stream<B, E | E2, R>`
- **Import guidance:** Start from `import { NodeStream } from "@effect/platform-node-shared"` and use `NodeStream.pipeThroughDuplex`.
- **Suggested snippet:** Create a finite stream, apply `NodeStream.pipeThroughDuplex`, consume it with `Stream.runCollect` or `Stream.runForEach`, and assert the stable ordering, cardinality, or failure behavior. Bound any potentially infinite stream first.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node-shared/NodeStream.pipeThroughSimple`

- **Source:** `packages/platform-node-shared/src/NodeStream.ts:169`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Pipes a stream of strings or bytes through a Node `Duplex` using default options and `Cause.UnknownError` for stream failures.
- **Signature hint:** `declare function pipeThroughSimple(duplex: LazyArg<Duplex>): <R, E>(self: Stream.Stream<string | Uint8Array, E, R>) => Stream.Stream<Uint8Array, E | Cause.UnknownError, R> declare function pipeThroughSimple<R, E>(self: Stream.Stream<string | Uint8Array, E, R>, duplex: LazyArg<Duplex>): Stream.Stream<Uint8Array, Cause.UnknownError | E, R>`
- **Import guidance:** Start from `import { NodeStream } from "@effect/platform-node-shared"` and use `NodeStream.pipeThroughSimple`.
- **Suggested snippet:** Create a finite stream, apply `NodeStream.pipeThroughSimple`, consume it with `Stream.runCollect` or `Stream.runForEach`, and assert the stable ordering, cardinality, or failure behavior. Bound any potentially infinite stream first.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node-shared/NodeStream.toReadable`

- **Source:** `packages/platform-node-shared/src/NodeStream.ts:190`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Converts an Effect `Stream` into a Node `Readable`, using the caller's Effect context to run the stream and destroying the readable if the stream fails.
- **Signature hint:** `declare function toReadable<E, R>(stream: Stream.Stream<string | Uint8Array, E, R>): Effect.Effect<Readable, never, R>`
- **Import guidance:** Start from `import { NodeStream } from "@effect/platform-node-shared"` and use `NodeStream.toReadable`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `NodeStream.toReadable`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node-shared/NodeStream.toReadableNever`

- **Source:** `packages/platform-node-shared/src/NodeStream.ts:203`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Converts a service-free Effect `Stream` into a Node `Readable` using an empty Effect context.
- **Signature hint:** `declare function toReadableNever<E>(stream: Stream.Stream<string | Uint8Array, E, never>): Readable`
- **Import guidance:** Start from `import { NodeStream } from "@effect/platform-node-shared"` and use `NodeStream.toReadableNever`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `NodeStream.toReadableNever`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node-shared/NodeStream.toUint8Array`

- **Source:** `packages/platform-node-shared/src/NodeStream.ts:320`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Consumes a Node readable stream into a `Uint8Array`, using the same error mapping and `maxBytes` handling as `toArrayBuffer`.
- **Signature hint:** `declare function toUint8Array<E = Cause.UnknownError>(readable: LazyArg<Readable | NodeJS.ReadableStream>, options?: { readonly onError?: (error: unknown) => E; readonly maxBytes?: SizeInput | undefined; }): Effect.Effect<Uint8Array, E>`
- **Import guidance:** Start from `import { NodeStream } from "@effect/platform-node-shared"` and use `NodeStream.toUint8Array`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `NodeStream.toUint8Array`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
