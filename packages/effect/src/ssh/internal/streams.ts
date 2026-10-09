/**
 * Backend-independent helpers built on SSH byte streams.
 *
 * @internal
 */
import * as Cause from "../../Cause.ts"
import * as Effect from "../../Effect.ts"
import * as Fiber from "../../Fiber.ts"
import * as Latch from "../../Latch.ts"
import * as Pull from "../../Pull.ts"
import type * as Scope from "../../Scope.ts"
import * as Socket from "../../socket/Socket.ts"
import * as Stream from "../../Stream.ts"
import type { SshProcess, SshStream } from "../Ssh.ts"
import type { RunResult, SessionOptions } from "../SshClient.ts"
import type { SshError } from "../SshError.ts"
import { concat, fromUtf8 } from "./wire.ts"

const collect = (stream: Stream.Stream<Uint8Array, SshError>) =>
  Effect.map(Stream.runCollect(stream), (chunks) => fromUtf8(concat(chunks)))

/**
 * Runs a command to completion, collecting its output.
 *
 * @internal
 */
export const run = (
  exec: (command: string, options?: SessionOptions) => Effect.Effect<SshProcess, SshError, Scope.Scope>
) =>
(
  command: string,
  options?: SessionOptions & { readonly stdin?: Uint8Array | string | undefined }
): Effect.Effect<RunResult, SshError> =>
  Effect.scoped(Effect.gen(function*() {
    const process = yield* exec(command, options)
    if (options?.stdin !== undefined) yield* process.write(options.stdin)
    yield* process.eof
    const [stdout, stderr] = yield* Effect.all([collect(process.stdout), collect(process.stderr)], {
      concurrency: 2
    })
    const exit = yield* process.exit
    return { stdout, stderr, exit }
  }))

/**
 * Exposes streams opened on demand as a `Socket.Socket`. Every reader
 * acquisition opens a new stream.
 *
 * @internal
 */
export const toSocket = (open: Effect.Effect<SshStream, SshError, Scope.Scope>): Socket.Socket => {
  let current: SshStream | undefined
  const latch = Latch.makeUnsafe(false)
  const toSocketError = <E>(cause: E) =>
    Cause.isDone(cause) ? cause : new Socket.SocketError({ reason: new Socket.SocketReadError({ cause }) })
  const reader: Socket.Socket["reader"] = Effect.gen(function*() {
    const stream = yield* open.pipe(
      Effect.mapError((cause) =>
        new Socket.SocketError({ reason: new Socket.SocketOpenError({ kind: "Unknown", cause }) })
      )
    )
    current = stream
    latch.openUnsafe()
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        current = undefined
        latch.closeUnsafe()
      })
    )
    const pull = yield* Stream.toPull(stream.stdout)
    return {
      pull: pull.pipe(
        Effect.mapError(toSocketError),
        Pull.catchDone(() =>
          Effect.fail(new Socket.SocketError({ reason: new Socket.SocketCloseError({ code: 1000 }) }))
        )
      ),
      upgrade: Socket.SocketUpgradeError.unsupported
    }
  })
  const write = (chunk: Uint8Array | string | Socket.CloseEvent): Effect.Effect<void, Socket.SocketError> =>
    Effect.suspend(() => {
      const stream = current
      if (stream === undefined) return latch.whenOpen(write(chunk))
      const effect = Socket.isCloseEvent(chunk) ? stream.close : stream.write(chunk)
      return Effect.mapError(
        effect,
        (cause) => new Socket.SocketError({ reason: new Socket.SocketWriteError({ cause }) })
      )
    })
  const writer: Socket.Socket["writer"] = Effect.as(
    Effect.addFinalizer(() => current === undefined ? Effect.void : Effect.ignore(current.eof)),
    {
      write,
      writeAll: (chunks) => Effect.forEach(chunks, write, { discard: true })
    }
  )
  return Socket.make({ reader, writer })
}

/**
 * Pipes a local socket to a stream until the remote side finishes.
 *
 * @internal
 */
export const pipeSocket = (
  local: Socket.Socket,
  open: Effect.Effect<SshStream, SshError, Scope.Scope>
): Effect.Effect<void, SshError | Socket.SocketError> =>
  Effect.scoped(Effect.gen(function*() {
    const stream = yield* open
    const pull = yield* Socket.readerBytes(local)
    const writer = yield* local.writer
    const upstream = yield* Effect.forever(
      Effect.flatMap(pull, (chunks) => Effect.forEach(chunks, (chunk) => stream.write(chunk), { discard: true }))
    ).pipe(
      Effect.catchTag("SocketError", () => stream.eof),
      Effect.ignore,
      Effect.forkScoped
    )
    yield* Stream.runForEach(stream.stdout, (chunk) => writer.write(chunk))
    yield* Fiber.interrupt(upstream)
  }))
