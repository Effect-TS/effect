# Example Suggestions: `effect/unstable/socket/Socket`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/socket/Socket.ts`
- **Uncovered API records:** 41
- **Priorities:** 0 required, 21 recommended, 15 optional, 5 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                             | Line | Kind               | Priority        |
| --------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/socket/Socket.make`                            |  100 | `root-declaration` | **recommended** |
| `effect/unstable/socket/Socket.layerWebSocketConstructorGlobal` |  569 | `root-declaration` | **recommended** |
| `effect/unstable/socket/Socket.fromWebSocket`                   |  606 | `root-declaration` | **recommended** |
| `effect/unstable/socket/Socket.layerWebSocket`                  |  787 | `root-declaration` | **recommended** |
| `effect/unstable/socket/Socket.fromTransformStream`             |  827 | `root-declaration` | **recommended** |
| `effect/unstable/socket/Socket.isSocket`                        |   44 | `root-declaration` | **recommended** |
| `effect/unstable/socket/Socket.Socket (value)`                  |   57 | `root-declaration` | **recommended** |
| `effect/unstable/socket/Socket.SocketReadError`                 |  223 | `root-declaration` | **recommended** |
| `effect/unstable/socket/Socket.SocketWriteError`                |  241 | `root-declaration` | **recommended** |
| `effect/unstable/socket/Socket.SocketOpenError`                 |  260 | `root-declaration` | **recommended** |
| `effect/unstable/socket/Socket.SocketCloseError`                |  284 | `root-declaration` | **recommended** |
| `effect/unstable/socket/Socket.SocketErrorReason (value)`       |  316 | `root-declaration` | **recommended** |
| `effect/unstable/socket/Socket.SocketError`                     |  342 | `root-declaration` | **recommended** |
| `effect/unstable/socket/Socket.toChannelMap`                    |  386 | `root-declaration` | **recommended** |
| `effect/unstable/socket/Socket.toChannel`                       |  444 | `root-declaration` | **recommended** |
| `effect/unstable/socket/Socket.toChannelString`                 |  464 | `root-declaration` | **recommended** |
| `effect/unstable/socket/Socket.makeChannel`                     |  521 | `root-declaration` | **recommended** |
| `effect/unstable/socket/Socket.defaultCloseCodeIsError`         |  538 | `root-declaration` | **recommended** |
| `effect/unstable/socket/Socket.WebSocket`                       |  547 | `root-declaration` | **recommended** |
| `effect/unstable/socket/Socket.WebSocketConstructor`            |  558 | `root-declaration` | **recommended** |
| `effect/unstable/socket/Socket.makeWebSocket`                   |  581 | `root-declaration` | **recommended** |
| `effect/unstable/socket/Socket.SocketErrorReason (type)`        |  329 | `root-declaration` | **optional**    |
| `effect/unstable/socket/Socket.isCloseEvent`                    |  191 | `root-declaration` | **optional**    |
| `effect/unstable/socket/Socket.isSocketError`                   |  215 | `root-declaration` | **optional**    |
| `effect/unstable/socket/Socket.toChannelWith`                   |  503 | `root-declaration` | **optional**    |
| `effect/unstable/socket/Socket.makeWebSocketChannel`            |  762 | `root-declaration` | **optional**    |
| `effect/unstable/socket/Socket.SendQueueCapacity`               |  802 | `root-declaration` | **optional**    |
| `effect/unstable/socket/Socket.Socket (type)`                   |   66 | `root-declaration` | **optional**    |
| `effect/unstable/socket/Socket.CloseEvent`                      |  160 | `root-declaration` | **optional**    |
| `effect/unstable/socket/Socket.CloseEvent.toString`             |  180 | `member`           | **optional**    |
| `effect/unstable/socket/Socket.SocketReadError.message`         |  232 | `member`           | **optional**    |
| `effect/unstable/socket/Socket.SocketWriteError.message`        |  250 | `member`           | **optional**    |
| `effect/unstable/socket/Socket.SocketOpenError.message`         |  270 | `member`           | **optional**    |
| `effect/unstable/socket/Socket.SocketCloseError.filterClean`    |  294 | `member`           | **optional**    |
| `effect/unstable/socket/Socket.SocketError.is`                  |  372 | `member`           | **optional**    |
| `effect/unstable/socket/Socket.InputTransformStream`            |  813 | `root-declaration` | **optional**    |
| `effect/unstable/socket/Socket.TypeId`                          |   36 | `root-declaration` | **discouraged** |
| `effect/unstable/socket/Socket.CloseEvent.CloseEventTypeId`     |  166 | `member`           | **discouraged** |
| `effect/unstable/socket/Socket.SocketErrorTypeId (type)`        |  199 | `root-declaration` | **discouraged** |
| `effect/unstable/socket/Socket.SocketErrorTypeId (value)`       |  207 | `root-declaration` | **discouraged** |
| `effect/unstable/socket/Socket.SocketError.SocketErrorTypeId`   |  365 | `member`           | **discouraged** |

## Recommended

### `effect/unstable/socket/Socket.make`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:100`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Constructs a `Socket` from a raw read loop and scoped writer, deriving binary and string read loops when they are not provided.
- **Signature hint:** `declare function make(options: { readonly runRaw: <_, E, R>(handler: (_: string | Uint8Array) => Effect.Effect<_, E, R> | void, options?: { readonly onOpen?: Effect.Effect<void> | undefined; }) => Effect.Effect<void, SocketError | E, R>; readonly run?: <_, E, R>(handler: (_: Uint8Array) => Effect.Effect<_, E, R> | void, options?: { readonly onOpen?: Effect.Effect<void> | undefined; }) => Effect.Effect<void, SocketError | E, R>; readonly runString?: <_, E, R>(handler: (_: string) => Effect.Effect<_, E, R> | void, options?: { readonly onOpen?: Effect.Effect<void> | undefined; }) => Effect.Effect<void, SocketError | E, R>; readonly writer: Effect.Effect<(chunk: Uint8Array | string | CloseEvent) => Effect.Effect<void, SocketError>, never, Scope.Scope>; }): Socket`
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.make`.
- **Suggested snippet:** Construct one representative value with `Socket.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/Socket.layerWebSocketConstructorGlobal`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:569`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides `WebSocketConstructor` using `globalThis.WebSocket`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.layerWebSocketConstructorGlobal`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Socket.layerWebSocketConstructorGlobal`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/Socket.fromWebSocket`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:606`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Builds a `Socket` from a scoped WebSocket acquisition effect, waiting for the socket to open, dispatching message handlers in fibers, and translating open, read, and close events into `SocketError` values.
- **Signature hint:** `declare function fromWebSocket<RO>(acquire: Effect.Effect<globalThis.WebSocket, SocketError, RO>, options?: { readonly closeCodeIsError?: ((code: number) => boolean) | undefined; readonly openTimeout?: Duration.Input | undefined; readonly onInitialRun?: ((ws: globalThis.WebSocket) => ReadonlyArray<MessageEvent>) | undefined; } | undefined): Effect.Effect<Socket, never, Exclude<RO, Scope.Scope>>`
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.fromWebSocket`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Socket.fromWebSocket`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/Socket.layerWebSocket`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:787`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides a `Socket` service backed by a WebSocket URL or URL effect.
- **Signature hint:** `declare function layerWebSocket(url: string | Effect.Effect<string>, options?: { readonly closeCodeIsError?: ((code: number) => boolean) | undefined; readonly openTimeout?: Duration.Input | undefined; readonly protocols?: string | Array<string> | undefined; } | undefined): Layer.Layer<Socket, never, WebSocketConstructor>`
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.layerWebSocket`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Socket.layerWebSocket`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/Socket.fromTransformStream`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:827`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Builds a `Socket` from a scoped `InputTransformStream`, reading incoming chunks through socket handlers and writing outgoing chunks to the writable stream, encoding strings as UTF-8 and using close-code classification for `CloseEvent` values.
- **Signature hint:** `declare function fromTransformStream<R>(acquire: Effect.Effect<InputTransformStream, SocketError, R>, options?: { readonly closeCodeIsError?: (code: number) => boolean; }): Effect.Effect<Socket, never, Exclude<R, Scope.Scope>>`
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.fromTransformStream`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Socket.fromTransformStream`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/Socket.isSocket`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:44`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is a `Socket`.
- **Signature hint:** `declare function isSocket(u: unknown): u is Socket`
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.isSocket`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Socket.isSocket` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/Socket.Socket (value)`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:57`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for bidirectional socket transports.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.Socket`.
- **Suggested snippet:** Consume `Socket.Socket` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/Socket.SocketReadError`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:223`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Typed error for failures that occur while reading from a socket.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.SocketReadError`.
- **Suggested snippet:** Create or capture `Socket.SocketReadError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/Socket.SocketWriteError`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:241`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Typed error for failures that occur while writing to a socket.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.SocketWriteError`.
- **Suggested snippet:** Create or capture `Socket.SocketWriteError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/Socket.SocketOpenError`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:260`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Typed error for failures that occur while opening a socket, including unknown open failures and open timeouts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.SocketOpenError`.
- **Suggested snippet:** Create or capture `Socket.SocketOpenError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/Socket.SocketCloseError`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:284`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Typed error for a socket close event, carrying the close code and optional close reason.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.SocketCloseError`.
- **Suggested snippet:** Create or capture `Socket.SocketCloseError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/Socket.SocketErrorReason (value)`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:316`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Schema for all socket-specific error reasons.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.SocketErrorReason`.
- **Suggested snippet:** Create or capture `Socket.SocketErrorReason` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/Socket.SocketError`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:342`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Tagged error that wraps socket read, write, open, and close failures while preserving the underlying reason.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.SocketError`.
- **Suggested snippet:** Create or capture `Socket.SocketError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/Socket.toChannelMap`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:386`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Converts a `Socket` into a bidirectional `Channel`, mapping incoming string or binary frames and writing outgoing frame batches to the socket.
- **Signature hint:** `declare function toChannelMap<IE, A>(self: Socket, f: (data: Uint8Array | string) => A): Channel.Channel<NonEmptyReadonlyArray<A>, SocketError | IE, void, NonEmptyReadonlyArray<Uint8Array | string | CloseEvent>, IE>`
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.toChannelMap`.
- **Suggested snippet:** Create a finite Channel, apply `Socket.toChannelMap`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/Socket.toChannel`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:444`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Converts a `Socket` into a binary `Channel`, encoding incoming string frames as UTF-8 bytes.
- **Signature hint:** `declare function toChannel<IE>(self: Socket): Channel.Channel<NonEmptyReadonlyArray<Uint8Array>, SocketError | IE, void, NonEmptyReadonlyArray<Uint8Array | string | CloseEvent>, IE>`
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.toChannel`.
- **Suggested snippet:** Create a finite Channel, apply `Socket.toChannel`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/Socket.toChannelString`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:464`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Converts a `Socket` into a string `Channel`, decoding binary frames with the optional text encoding.
- **Signature hint:** `declare function toChannelString(encoding?: string | undefined): <IE>(self: Socket) => Channel.Channel<NonEmptyReadonlyArray<string>, SocketError | IE, void, NonEmptyReadonlyArray<Uint8Array | string | CloseEvent>, IE> declare function toChannelString<IE>(self: Socket, encoding?: string | undefined): Channel.Channel<NonEmptyReadonlyArray<string>, SocketError | IE, void, NonEmptyReadonlyArray<Uint8Array | string | CloseEvent>, IE>`
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.toChannelString`.
- **Suggested snippet:** Create a finite Channel, apply `Socket.toChannelString`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/Socket.makeChannel`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:521`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a binary socket `Channel` from the `Socket` service in the environment.
- **Signature hint:** `declare function makeChannel<IE = never>(): Channel.Channel<NonEmptyReadonlyArray<Uint8Array>, SocketError | IE, void, NonEmptyReadonlyArray<Uint8Array | string | CloseEvent>, IE, unknown, Socket>`
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.makeChannel`.
- **Suggested snippet:** Create a finite Channel, apply `Socket.makeChannel`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/Socket.defaultCloseCodeIsError`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:538`
- **Kind / category:** `root-declaration` / `predicates`
- **Priority:** **recommended**
- **Current description:** Default close-code classifier that treats every socket close code as an error.
- **Signature hint:** `declare function defaultCloseCodeIsError(_code: number): boolean`
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.defaultCloseCodeIsError`.
- **Suggested snippet:** Create or capture `Socket.defaultCloseCodeIsError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/Socket.WebSocket`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:547`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Context service for the active `WebSocket` instance available while a WebSocket-backed socket run is handling events.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.WebSocket`.
- **Suggested snippet:** Consume `Socket.WebSocket` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/Socket.WebSocketConstructor`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:558`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Context service for constructing `WebSocket` instances from a URL and optional protocols.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.WebSocketConstructor`.
- **Suggested snippet:** Consume `Socket.WebSocketConstructor` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/socket/Socket.makeWebSocket`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:581`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Socket` backed by a `WebSocketConstructor`, acquiring the WebSocket for each run and using the close-code classifier to decide which closes fail the run.
- **Signature hint:** `declare function makeWebSocket(url: string | Effect.Effect<string>, options?: { readonly closeCodeIsError?: ((code: number) => boolean) | undefined; readonly openTimeout?: Duration.Input | undefined; readonly protocols?: string | Array<string> | undefined; }): Effect.Effect<Socket, never, WebSocketConstructor>`
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.makeWebSocket`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Socket.makeWebSocket`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/socket/Socket.SocketErrorReason (type)`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:329`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **optional**
- **Current description:** Union of socket-specific read, write, open, and close error reasons.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/socket/Socket.SocketErrorReason`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/socket/Socket.isCloseEvent`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:191`
- **Kind / category:** `root-declaration` / `refinements`
- **Priority:** **optional**
- **Current description:** Returns `true` when a value is a `CloseEvent`.
- **Signature hint:** `declare function isCloseEvent(u: unknown): u is CloseEvent`
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.isCloseEvent`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Socket.isCloseEvent` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/socket/Socket.isSocketError`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:215`
- **Kind / category:** `root-declaration` / `refinements`
- **Priority:** **optional**
- **Current description:** Returns `true` when a value is a `SocketError`.
- **Signature hint:** `declare function isSocketError(u: unknown): u is SocketError`
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.isSocketError`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Socket.isSocketError` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/socket/Socket.toChannelWith`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:503`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **optional**
- **Current description:** Creates a `Socket` to binary `Channel` adapter with a fixed upstream error type.
- **Signature hint:** `declare function toChannelWith<IE = never>(): (self: Socket) => Channel.Channel<NonEmptyReadonlyArray<Uint8Array>, SocketError | IE, void, NonEmptyReadonlyArray<Uint8Array | string | CloseEvent>, IE>`
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.toChannelWith`.
- **Suggested snippet:** Create a finite Channel, apply `Socket.toChannelWith`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/socket/Socket.makeWebSocketChannel`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:762`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a binary `Channel` backed by a WebSocket URL, requiring a `WebSocketConstructor` service.
- **Signature hint:** `declare function makeWebSocketChannel<IE = never>(url: string, options?: { readonly closeCodeIsError?: (code: number) => boolean; }): Channel.Channel<NonEmptyReadonlyArray<Uint8Array>, SocketError | IE, void, NonEmptyReadonlyArray<Uint8Array | string | CloseEvent>, IE, unknown, WebSocketConstructor>`
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.makeWebSocketChannel`.
- **Suggested snippet:** Create a finite Channel, apply `Socket.makeWebSocketChannel`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/socket/Socket.SendQueueCapacity`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:802`
- **Kind / category:** `root-declaration` / `fiber refs`
- **Priority:** **optional**
- **Current description:** Context reference for socket send queue capacity, defaulting to `16`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.SendQueueCapacity`.
- **Suggested snippet:** Consume `Socket.SendQueueCapacity` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/socket/Socket.Socket (type)`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:66`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Effect-based socket abstraction for running string or binary read handlers and obtaining a scoped writer for outgoing frames and close events.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/socket/Socket.Socket`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/socket/Socket.CloseEvent`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:160`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a socket close event value carrying a close code and optional reason.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.CloseEvent`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Socket.CloseEvent`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/socket/Socket.CloseEvent.toString`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:180`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formats the close code and optional reason for display.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/socket/Socket.CloseEvent.toString` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/socket/Socket.SocketReadError.message`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:232`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Default message used for socket read failures.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/socket/Socket.SocketReadError.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/socket/Socket.SocketWriteError.message`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:250`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Default message used for socket write failures.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/socket/Socket.SocketWriteError.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/socket/Socket.SocketOpenError.message`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:270`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formats timeout and unknown open failures for display.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/socket/Socket.SocketOpenError.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/socket/Socket.SocketCloseError.filterClean`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:294`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Separates clean socket close errors from errors that should remain failures.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/socket/Socket.SocketCloseError.filterClean` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/socket/Socket.SocketError.is`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:372`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns `true` when the value is a `SocketError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/socket/Socket.SocketError.is` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/socket/Socket.InputTransformStream`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:813`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Readable and writable stream pair used to adapt transform-style streams into a `Socket`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/socket/Socket.InputTransformStream`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/socket/Socket.TypeId`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:36`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier attached to `Socket` services.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Socket.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/socket/Socket.CloseEvent.CloseEventTypeId`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:166`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a socket close event for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/socket/Socket.CloseEvent.CloseEventTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/socket/Socket.SocketErrorTypeId (type)`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:199`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to mark `SocketError` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/socket/Socket.SocketErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/socket/Socket.SocketErrorTypeId (value)`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:207`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier attached to `SocketError` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Socket } from "effect/unstable/socket"` and use `Socket.SocketErrorTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Socket.SocketErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/socket/Socket.SocketError.SocketErrorTypeId`

- **Source:** `packages/effect/src/unstable/socket/Socket.ts:365`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a socket error wrapper for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/socket/Socket.SocketError.SocketErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
