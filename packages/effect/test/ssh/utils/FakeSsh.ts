/**
 * An in-memory `Ssh.SshConnection` whose commands and subsystems are served
 * by a handler, for testing code built on the backend-independent interface
 * without a server.
 */
import type * as Cause from "effect/Cause"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Queue from "effect/Queue"
import type * as Scope from "effect/Scope"
import * as Sink from "effect/Sink"
import * as Ssh from "effect/ssh/Ssh"
import * as Stream from "effect/Stream"

/**
 * The server side of a command or subsystem.
 */
export interface ServerChannel {
  /** Data written by the client; ends when the client sends EOF or closes. */
  readonly input: Queue.Queue<Uint8Array, Cause.Done>
  /** Signals delivered by the client. */
  readonly signals: Queue.Queue<string>
  readonly write: (data: Uint8Array | string) => Effect.Effect<void>
  readonly writeStderr: (data: Uint8Array | string) => Effect.Effect<void>
  readonly exit: (code: number) => Effect.Effect<void>
  readonly exitSignal: (signal: string) => Effect.Effect<void>
  /** Ends standard output and standard error. */
  readonly eof: Effect.Effect<void>
  readonly close: Effect.Effect<void>
}

export interface SessionStart {
  readonly type: "exec" | "subsystem"
  readonly value: string
}

export type Handler = (channel: ServerChannel, start: SessionStart) => Effect.Effect<void>

const encoder = new TextEncoder()
const toBytes = (data: Uint8Array | string) => typeof data === "string" ? encoder.encode(data) : data

const channelError = (description: string) => new Ssh.SshError({ reason: "Channel", description })

const open = Effect.fnUntraced(function*(
  handler: Handler,
  start: SessionStart
): Effect.fn.Return<Ssh.SshProcess, never, Scope.Scope> {
  const input = yield* Queue.unbounded<Uint8Array, Cause.Done>()
  const stdout = yield* Queue.unbounded<Uint8Array, Cause.Done>()
  const stderr = yield* Queue.unbounded<Uint8Array, Cause.Done>()
  const signals = yield* Queue.unbounded<string>()
  const exit = yield* Deferred.make<Ssh.SessionExit, Ssh.SshError>()
  let closed = false
  const endOutput = Effect.andThen(Queue.end(stdout), Queue.end(stderr))
  const close = Effect.suspend(() => {
    if (closed) return Effect.void
    closed = true
    return Effect.all([
      Queue.end(input),
      endOutput,
      Deferred.fail(exit, channelError("the channel closed without an exit status"))
    ], { discard: true })
  })
  const channel: ServerChannel = {
    input,
    signals,
    write: (data) => Effect.asVoid(Queue.offer(stdout, toBytes(data))),
    writeStderr: (data) => Effect.asVoid(Queue.offer(stderr, toBytes(data))),
    exit: (code) => Effect.asVoid(Deferred.succeed(exit, { _tag: "ExitStatus", code })),
    exitSignal: (signal) =>
      Effect.asVoid(Deferred.succeed(exit, { _tag: "ExitSignal", signal, coreDumped: false, message: "" })),
    eof: Effect.asVoid(endOutput),
    close
  }
  yield* Effect.addFinalizer(() => close)
  yield* Effect.forkScoped(handler(channel, start))
  const write = (data: Uint8Array | string) =>
    closed ? Effect.fail(channelError("the channel is closed")) : Effect.asVoid(Queue.offer(input, toBytes(data)))
  const eof = Effect.asVoid(Queue.end(input))
  return {
    stdout: Stream.fromQueue(stdout),
    stderr: Stream.fromQueue(stderr),
    stdin: Sink.forEach(write).pipe(Sink.mapEffect(() => eof)),
    write,
    eof,
    close,
    exit: Deferred.await(exit),
    signal: (signal) => Effect.asVoid(Queue.offer(signals, signal))
  }
})

/**
 * Creates a connection that serves every command and subsystem with
 * `handler`. Forwarding is not supported.
 */
export const make = (handler: Handler): Ssh.SshConnection =>
  Ssh.makeConnection({
    backend: "fake",
    exec: (command) => open(handler, { type: "exec", value: command }),
    subsystem: (name) => open(handler, { type: "subsystem", value: name }),
    forwardOut: () => Effect.fail(channelError("forwarding is not supported"))
  })
