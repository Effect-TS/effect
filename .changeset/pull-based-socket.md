---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
"@effect/platform-browser": patch
"@effect/ai-openai": patch
---

Redesign `Socket` around a pull-based read side with end-to-end backpressure.

`Socket` now exposes `reader` and `writer` instead of handler-based run loops. Acquiring `reader` dials the connection; the scope owns the connection lifecycle, and the returned `Effect` yields non-empty batches of frames (one concatenated buffer for TCP, one element per frame for WebSocket). The reader is typed as `Effect<…, SocketError>` rather than `Pull` because it never completes via `Cause.Done`. Nothing is read from the transport until the consumer pulls: Node TCP sockets stay paused so the kernel window closes, while `ws` WebSockets start paused, resume on the first pull, pause when buffered frames reach `highWaterMark`, and resume after the buffer drains. Browser WebSockets cannot pause the transport, so they continue buffering and optionally fail with `SocketReadError` after exceeding `highWaterMark`. Writes use the transport's native backpressure (`write()` return values plus `drain`, `cork`/`uncork` for batches).

### Breaking changes

- `Socket.run`, `Socket.runString`, and `Socket.runRaw` are removed. Acquire `socket.reader` (or `Socket.readerBytes` / `Socket.readerString`) in a scope and pull in a loop instead. Code between the acquisition and the first pull runs once per (re)connection, replacing the `onOpen` option.
- `Socket.make` now takes `{ reader, writer }` with no derivation logic.
- `writer` now yields a `Writer` object with `write` and `writeAll` methods instead of a write function. Acquisition is `Effect<Writer, never, Scope>` because it cannot fail; `write` / `writeAll` still fail with `SocketError`.
- Every termination is an error: any close, clean or not, fails the pull with a `SocketError` wrapping `SocketCloseError`. `closeCodeIsError`, `defaultCloseCodeIsError`, and `SocketCloseError.filterClean` are removed; consumers that treat a close as normal catch the error. Auto-reconnect is a plain `Effect.retry` around the scoped consume loop:

  ```ts
  Effect.gen(function*() {
    const pull = yield* socket.reader
    while (true) {
      yield* handle(yield* pull)
    }
  }).pipe(
    Effect.scoped,
    Effect.retry({ schedule: Schedule.exponential(200) })
  )
  ```

- `Socket.toChannel` / `Socket.toChannelString` are now backed by the pull, so channel and stream consumption is genuinely backpressured, and the channel fails with `SocketError` on close instead of ending. `Socket.toStream` is added for read-only consumption.
- `fromWebSocket` drops the `onInitialRun` option; `SendQueueCapacity` is removed.
- Server sockets pause immediately on accept, and an accepted socket's `reader` attaches to the existing connection, so a second acquisition after close fails instead of reconnecting.
