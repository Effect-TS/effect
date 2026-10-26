import type * as Cause from "../../Cause.ts"
import * as Deferred from "../../Deferred.ts"
import * as Effect from "../../Effect.ts"
import * as Exit from "../../Exit.ts"
import * as Queue from "../../Queue.ts"
import * as Scope from "../../Scope.ts"
import * as Sink from "../../Sink.ts"
import * as Socket from "../../socket/Socket.ts"
import * as Stream from "../../Stream.ts"
import type * as DockerApi from "../DockerApi.ts"
import type { LogFrame } from "../DockerContainers.ts"
import type { DockerEngine } from "../DockerEngine.ts"
import { DockerError, InvalidResponse, StdinNotAttached, StreamFailed } from "../DockerError.ts"
import type { Handle } from "../DockerExec.ts"
import { connectionFailed } from "./engine.ts"

// -----------------------------------------------------------------------------
// logs
// -----------------------------------------------------------------------------

/**
 * The query of logs, with an unset `stdout` or `stderr` included unless the
 * other is `true`: the Engine rejects neither.
 *
 * @internal
 */
export const logsQuery = <
  Options extends { readonly stdout?: boolean | undefined; readonly stderr?: boolean | undefined }
>(options: Options | undefined) => ({
  ...options,
  stdout: options?.stdout ?? options?.stderr !== true,
  stderr: options?.stderr ?? options?.stdout !== true
})

/**
 * The frames of a service's or task's logs. From API 1.42 the Engine always
 * names the framing in the `Content-Type`.
 *
 * @internal
 */
export const logFrames = (
  logs: {
    readonly headers: { readonly "content-type"?: DockerApi.StreamContentType | undefined }
    readonly body: Stream.Stream<Uint8Array, DockerError>
  },
  operation: string
): Stream.Stream<LogFrame, DockerError> => {
  const contentType = logs.headers["content-type"]
  return contentType === undefined
    ? Stream.fail(
      new DockerError({ reason: new InvalidResponse({ issue: "the logs have no stream Content-Type" }), operation })
    )
    : frames(logs.body, contentType)
}

// -----------------------------------------------------------------------------
// stream framing
// -----------------------------------------------------------------------------

/*
 * The Engine's stream framing for logs, attach and exec, which the response's
 * `Content-Type` names (`DockerApi.StreamContentType`).
 *
 * Without a TTY the Engine multiplexes stdout and stderr: each frame has an
 * 8-byte header `[type, 0, 0, 0, size (uint32, big-endian)]` followed by `size`
 * bytes. Type 0 is stdin (written on stdout), 1 stdout, 2 stderr, 3 systemerr;
 * any other type is an error, as in moby's `stdcopy`. With a TTY the stream
 * is raw stdout.
 */

/**
 * The content type of a stream that has none: raw with a TTY, multiplexed
 * otherwise.
 *
 * @internal
 */
export const contentTypeOf = (tty: boolean): DockerApi.StreamContentType =>
  tty ? "application/vnd.docker.raw-stream" : "application/vnd.docker.multiplexed-stream"

/**
 * The content type of an upgraded stream: the `Content-Type` the Engine sent,
 * `orElse` without one, and `InvalidResponse` for any other media type.
 *
 * @internal
 */
export const upgradeContentType = (
  contentType: string | undefined,
  orElse: Effect.Effect<DockerApi.StreamContentType, DockerError>,
  operation: string
): Effect.Effect<DockerApi.StreamContentType, DockerError> =>
  contentType === undefined
    ? orElse
    : contentType === "application/vnd.docker.raw-stream" || contentType === "application/vnd.docker.multiplexed-stream"
    ? Effect.succeed(contentType)
    : Effect.fail(
      new DockerError({
        reason: new InvalidResponse({ issue: `the stream has an unknown Content-Type: ${contentType}` }),
        operation
      })
    )

/**
 * The result of feeding bytes to a demultiplexer. `SystemError` ends the
 * stream: a systemerr frame, or a header of an unknown stream type.
 */
type DemuxResult =
  | { readonly _tag: "Frames"; readonly frames: ReadonlyArray<LogFrame> }
  | { readonly _tag: "SystemError"; readonly frames: ReadonlyArray<LogFrame>; readonly message: string }

/**
 * A stateful demultiplexer. Feed it chunks in order; it returns the complete
 * frames, keeping partial ones for the next chunk. `pending` counts the bytes
 * of an incomplete frame; at the end of the stream it must be 0.
 */
const makeDemuxer = () => {
  let buffer: Uint8Array = new Uint8Array(0)
  const push = (chunk: Uint8Array): DemuxResult => {
    if (buffer.length > 0) {
      const merged = new Uint8Array(buffer.length + chunk.length)
      merged.set(buffer)
      merged.set(chunk, buffer.length)
      buffer = merged
    } else {
      buffer = chunk
    }
    const frames: Array<LogFrame> = []
    let offset = 0
    while (buffer.length - offset >= 8) {
      const type = buffer[offset]
      if (type > 3) {
        buffer = buffer.slice(offset)
        return { _tag: "SystemError", frames, message: `Unrecognized input header: ${type}` }
      }
      const size = ((buffer[offset + 4] << 24) >>> 0) + (buffer[offset + 5] << 16) + (buffer[offset + 6] << 8) +
        buffer[offset + 7]
      if (buffer.length - offset - 8 < size) break
      const data = buffer.slice(offset + 8, offset + 8 + size)
      offset += 8 + size
      if (type === 3) {
        buffer = buffer.slice(offset)
        return { _tag: "SystemError", frames, message: new TextDecoder().decode(data).trim() }
      }
      if (size > 0) frames.push({ stream: type === 2 ? "stderr" : "stdout", data })
    }
    buffer = offset === buffer.length ? new Uint8Array(0) : buffer.slice(offset)
    return { _tag: "Frames", frames }
  }
  return {
    push,
    get pending() {
      return buffer.length
    }
  }
}

const systemError = (message: string): DockerError => new DockerError({ reason: new StreamFailed({ message }) })

const truncatedFrame = (pending: number): DockerError =>
  new DockerError({
    reason: new StreamFailed({ message: `The stream ended inside a multiplexed frame (${pending} bytes left over)` })
  })

/**
 * Turns a byte stream into frames, as its content type frames it.
 *
 * @internal
 */
export const frames = <E, R>(
  bytes: Stream.Stream<Uint8Array, E, R>,
  contentType: DockerApi.StreamContentType
): Stream.Stream<LogFrame, E | DockerError, R> => {
  if (contentType === "application/vnd.docker.raw-stream") {
    return Stream.map(bytes, (data): LogFrame => ({ stream: "stdout", data }))
  }
  return Stream.suspend(() => {
    const demuxer = makeDemuxer()
    return Stream.flatMap(bytes, (chunk): Stream.Stream<LogFrame, DockerError> => {
      const result = demuxer.push(chunk)
      return result._tag === "Frames"
        ? Stream.fromIterable(result.frames)
        : Stream.concat(Stream.fromIterable(result.frames), Stream.fail(systemError(result.message)))
    }).pipe(
      Stream.concat(
        Stream.suspend(() => demuxer.pending > 0 ? Stream.fail(truncatedFrame(demuxer.pending)) : Stream.empty)
      )
    )
  })
}

// -----------------------------------------------------------------------------
// handles
// -----------------------------------------------------------------------------

/**
 * Runs `effect` in a scope of its own below the current one, closed at once
 * when `effect` fails, so a failed exec start or attach doesn't keep its
 * connections until the caller's scope closes.
 *
 * @internal
 */
export const releaseOnFailure = <A, E, R>(
  effect: Effect.Effect<A, E, R | Scope.Scope>
): Effect.Effect<A, E, Exclude<R, Scope.Scope> | Scope.Scope> =>
  Effect.gen(function*() {
    const scope = yield* Scope.fork(yield* Scope.Scope)
    return yield* Scope.provide(effect, scope).pipe(
      Effect.onError((cause) => Scope.close(scope, Exit.failCause(cause)))
    )
  })

/** How many chunks each view buffers before the connection stalls, like a pipe's buffer. */
const bufferChunks = 16

/** The end of the Engine's side of an upgraded connection, rather than a failure. */
const isEnd = (error: Socket.SocketError): boolean =>
  error.reason._tag === "SocketCloseError" && error.reason.code === 1000

/**
 * Builds a handle over an upgraded connection. A fiber in the current scope
 * pumps the connection into one bounded queue per stream, so an unread stream
 * stalls the connection and nothing is dropped.
 *
 * @internal
 */
export const makeHandle = (options: {
  readonly engine: DockerEngine["Service"]
  readonly socket: Socket.Socket
  /**
   * The framing, resolved once the connection is owned: a failure closes the
   * connection with the current scope.
   */
  readonly contentType: Effect.Effect<DockerApi.StreamContentType, DockerError>
  readonly stdin: boolean
  /**
   * For exec, runs once the output has ended (`outputDone` fails with the
   * connection's error if reading it failed); for attach, awaits `/wait`.
   */
  readonly exitCode: (outputDone: Effect.Effect<void, DockerError>) => Effect.Effect<number, DockerError>
  readonly resize: (size: DockerApi.TtySize) => Effect.Effect<void, DockerError>
}): Effect.Effect<Handle, DockerError, Scope.Scope> =>
  Effect.gen(function*() {
    const { endpoint } = options.engine.config
    const failed = (cause: unknown) => connectionFailed(endpoint, cause)
    // releasing the reader's scope (the caller's) closes the connection
    const pull = yield* Effect.mapError(Socket.readerBytes(options.socket), failed)
    const contentType = yield* options.contentType
    const stdout = yield* Queue.bounded<Uint8Array, DockerError | Cause.Done>(bufferChunks)
    const stderr = yield* Queue.bounded<Uint8Array, DockerError | Cause.Done>(bufferChunks)
    const outputDone = yield* Deferred.make<void, DockerError>()

    const demuxer = makeDemuxer()
    const pump = Effect.gen(function*() {
      while (true) {
        const chunks = yield* pull.pipe(
          Effect.catchIf(isEnd, () => Effect.undefined),
          Effect.mapError(failed)
        )
        if (chunks === undefined) break
        for (const chunk of chunks) {
          if (contentType === "application/vnd.docker.raw-stream") {
            yield* Queue.offer(stdout, chunk)
            continue
          }
          const result = demuxer.push(chunk)
          for (const frame of result.frames) {
            yield* Queue.offer(frame.stream === "stdout" ? stdout : stderr, frame.data)
          }
          if (result._tag === "SystemError") return yield* Effect.fail(systemError(result.message))
        }
      }
      // a frame cut short by the end of the connection is an error, not lost output
      if (demuxer.pending > 0) return yield* Effect.fail(truncatedFrame(demuxer.pending))
    }).pipe(
      Effect.matchEffect({
        onFailure: (error) =>
          Effect.all([Queue.fail(stdout, error), Queue.fail(stderr, error), Deferred.fail(outputDone, error)]),
        onSuccess: () => Effect.all([Queue.end(stdout), Queue.end(stderr), Deferred.succeed(outputDone, undefined)])
      }),
      Effect.onInterrupt(() => Deferred.interrupt(outputDone))
    )
    yield* Effect.forkScoped(pump)

    let stdin: Handle["stdin"] = Sink.fail(new DockerError({ reason: new StdinNotAttached() }))
    if (options.stdin) {
      // the writer gets a scope of its own: releasing it half-closes the connection
      const writeScope = yield* Scope.fork(yield* Scope.Scope)
      const writer = yield* Scope.provide(options.socket.writer, writeScope)
      stdin = Sink.forEach((chunk: Uint8Array) => Effect.mapError(writer.write(chunk), failed)).pipe(
        // only a cleanly ended input is stdin EOF; a failed one must not look like the end of the data
        Sink.onExit((exit) => Exit.isSuccess(exit) ? Scope.close(writeScope, Exit.void) : Effect.void)
      )
    }

    const exitCode = yield* Effect.cached(options.exitCode(Deferred.await(outputDone)))

    const stdoutStream = Stream.fromQueue(stdout)
    const stderrStream = Stream.fromQueue(stderr)
    return {
      stdin,
      stdout: stdoutStream,
      stderr: stderrStream,
      all: Stream.merge(stdoutStream, stderrStream),
      exitCode,
      resize: options.resize
    }
  })
