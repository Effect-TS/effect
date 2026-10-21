/**
 * Commands run inside an already running container.
 *
 * An exec is created with `create` (the Engine's `ExecConfig`, in its own
 * PascalCase) and started with `start`, which returns a scoped
 * {@link Handle} shaped like `effect/process`'s `ChildProcessHandle`.
 * `run` does both and collects the output. `DockerContainers.attach` returns
 * the same {@link Handle}.
 *
 * **Example** (Running a command)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { DockerExec } from "effect/docker"
 *
 * const program = Effect.gen(function*() {
 *   const exec = yield* DockerExec.DockerExec
 *   const result = yield* exec.run("my-container", ["sh", "-c", "echo hello; exit 3"])
 *   return { exitCode: result.exitCode, stdout: new TextDecoder().decode(result.stdout) }
 * })
 * ```
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Cause from "../Cause.ts"
import * as Context from "../Context.ts"
import * as Deferred from "../Deferred.ts"
import * as Effect from "../Effect.ts"
import * as Exit from "../Exit.ts"
import * as HttpClientRequest from "../http/HttpClientRequest.ts"
import type * as HttpClientResponse from "../http/HttpClientResponse.ts"
import * as Layer from "../Layer.ts"
import * as Queue from "../Queue.ts"
import type * as Redacted from "../Redacted.ts"
import * as Scope from "../Scope.ts"
import * as Sink from "../Sink.ts"
import * as Socket from "../socket/Socket.ts"
import * as Stream from "../Stream.ts"
import * as DockerApi from "./DockerApi.ts"
import type { LogFrame } from "./DockerContainers.ts"
import { apiClient, connectionFailed, DockerEngine, filterStatus, withOperation } from "./DockerEngine.ts"
import { DockerError, InvalidResponse, StdinNotAttached, StreamFailed } from "./DockerError.ts"
import type * as DockerSchema from "./DockerSchema.ts"

/**
 * A running exec or attach, shaped like `effect/process`'s
 * `ChildProcessHandle`.
 *
 * **Details**
 *
 * - `stdin`: ending it half-closes the connection, which is stdin EOF; an
 *   input stream that fails doesn't half-close. It fails with
 *   `StdinNotAttached` when stdin wasn't requested.
 * - `stdout`, `stderr` and `all` share one connection. Each stream has a small
 *   bounded buffer, so an unread stream stalls the connection (and
 *   `exitCode` with it), as an unread pipe stalls a process. Nothing is
 *   dropped. With a TTY, all output is on `stdout`.
 * - `exitCode`: for an exec, the exit code once the output has ended; for an
 *   attach, the result of `/wait?condition=next-exit`.
 * - `resize` sets the TTY size.
 *
 * Closing the handle's scope closes the connection.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface Handle {
  readonly stdin: Sink.Sink<void, Uint8Array, never, DockerError>
  readonly stdout: Stream.Stream<Uint8Array, DockerError>
  readonly stderr: Stream.Stream<Uint8Array, DockerError>
  readonly all: Stream.Stream<Uint8Array, DockerError>
  readonly exitCode: Effect.Effect<number, DockerError>
  readonly resize: (size: DockerApi.TtySize) => Effect.Effect<void, DockerError>
}

/**
 * The exit code once the output has ended. The Engine may record it a moment
 * after the streams close, so a still-running exec is inspected again, backing
 * off up to half a second. With `giveUp`, an exec still running after about
 * two seconds of that is `giveUp`'s failure instead. A stopped exec without an
 * exit code is an invalid response.
 */
const exitCodeWith = (
  inspect: DockerExec["Service"]["inspect"],
  id: string,
  giveUp?: DockerError,
  delay = 10,
  waited = 0
): Effect.Effect<number, DockerError> =>
  inspect(id).pipe(
    Effect.flatMap((result) => {
      if (result.Running === true) {
        if (giveUp !== undefined && waited >= 2000) return Effect.fail(giveUp)
        return Effect.andThen(
          Effect.sleep(delay),
          exitCodeWith(inspect, id, giveUp, Math.min(delay * 2, 500), waited + delay)
        )
      }
      if (typeof result.ExitCode === "number") return Effect.succeed(result.ExitCode)
      return Effect.fail(
        new DockerError({
          reason: new InvalidResponse({
            issue: "the exec stopped without an exit code",
            operation: "docker.Exec.inspect"
          })
        })
      )
    })
  )

/**
 * The collected result of `run`: the exit code and the output, as bytes.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface RunResult {
  readonly exitCode: number
  readonly stdout: Uint8Array
  readonly stderr: Uint8Array
}

/** An error of the caller's stdin input, told apart from the connection's write errors. */
class InputFailed {
  readonly error: DockerError
  constructor(error: DockerError) {
    this.error = error
  }
}

const concat = (chunks: ReadonlyArray<Uint8Array>): Uint8Array => {
  const out = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.length, 0))
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

// -----------------------------------------------------------------------------
// service
// -----------------------------------------------------------------------------

/**
 * The exec API.
 *
 * @stability unstable
 * @category services
 * @since 4.0.6
 */
export class DockerExec extends Context.Service<DockerExec, {
  /**
   * Creates an exec in a running container.
   *
   * **Details**
   *
   * [Engine API: ContainerExec](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Exec/operation/ContainerExec).
   * Set `AttachStdin`, `AttachStdout` and `AttachStderr` for what `start`
   * should connect. Without `DetachKeys`, the configured detach keys apply.
   * `Env` entries can be `Redacted`, and are sent unwrapped.
   *
   * Typical reasons: `NotFound` (no such container), `Conflict` (the container
   * isn't running), `ConnectionFailed`.
   */
  readonly create: (
    container: string,
    config: DockerApi.ExecConfig
  ) => Effect.Effect<DockerSchema.IDResponse, DockerError>
  /**
   * Inspects an exec.
   *
   * **Details**
   *
   * [Engine API: ExecInspect](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Exec/operation/ExecInspect).
   * Typical reasons: `NotFound`, `ConnectionFailed`.
   */
  readonly inspect: (id: string) => Effect.Effect<DockerSchema.ExecInspectResponse, DockerError>
  /**
   * Resizes the TTY of an exec.
   *
   * **Details**
   *
   * [Engine API: ExecResize](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Exec/operation/ExecResize).
   * Typical reasons: `NotFound`, `ConnectionFailed`.
   */
  readonly resize: (id: string, size: DockerApi.TtySize) => Effect.Effect<void, DockerError>
  /**
   * Starts an exec and connects to it.
   *
   * **Details**
   *
   * [Engine API: ExecStart](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Exec/operation/ExecStart).
   * The exec is inspected first, for its TTY and stdin settings. The framing of
   * the output follows the response's content type, or the exec's TTY when the
   * Engine sends none. There are no timeouts: close the scope to stop.
   *
   * Typical reasons: `NotFound`, `Conflict` (already started, or the container
   * stopped), `ConnectionFailed`, and `StreamFailed` on the output streams.
   *
   * **Example** (Feeding stdin)
   *
   * ```ts import.meta.vitest
   * import { Effect, Stream } from "effect"
   * import { DockerExec } from "effect/docker"
   *
   * const program = Effect.scoped(Effect.gen(function*() {
   *   const exec = yield* DockerExec.DockerExec
   *   const { Id } = yield* exec.create("my-container", {
   *     Cmd: ["cat"],
   *     AttachStdin: true,
   *     AttachStdout: true,
   *     AttachStderr: true
   *   })
   *   const handle = yield* exec.start(Id)
   *   yield* Stream.make(new TextEncoder().encode("hello\n")).pipe(Stream.run(handle.stdin))
   *   const output = yield* handle.stdout.pipe(Stream.decodeText(), Stream.mkString)
   *   return { output, exitCode: yield* handle.exitCode }
   * }))
   * ```
   */
  readonly start: (
    id: string,
    options?: {
      /** The size of the TTY at start. */
      readonly consoleSize?: DockerApi.TtySize | undefined
    }
  ) => Effect.Effect<Handle, DockerError, Scope.Scope>
  /**
   * Runs a command in a running container and collects its output.
   *
   * **Details**
   *
   * Creates the exec, starts it, writes `stdin` (if given) and closes it, and
   * reads stdout and stderr concurrently, as bytes: decode them with
   * `TextDecoder` for text. It doesn't fail on a non-zero exit code. With
   * `tty: true` all output is in `stdout`.
   *
   * A command that exits without reading all of its stdin still returns its
   * exit code: once the output has ended, a failed stdin write counts as done,
   * and input that is still pending is dropped, as in the Docker CLI. If the
   * connection then drops, the exit code still counts once the exec has
   * stopped. A failing `stdin` stream fails `run` at once without
   * half-closing stdin; the connection is then closed, which the Engine also
   * reads as the end of the command's input.
   *
   * Options mirror `ExecConfig`: `env` is `KEY=value` strings (or `Redacted` ones), `workingDir`,
   * `user` and `privileged` are passed through.
   *
   * Typical reasons: `NotFound`, `Conflict`, `ConnectionFailed`.
   *
   * **Example** (Reading a file as text)
   *
   * ```ts import.meta.vitest
   * import { Effect } from "effect"
   * import { DockerExec } from "effect/docker"
   *
   * const hostname = DockerExec.DockerExec.use((exec) =>
   *   Effect.map(
   *     exec.run("my-container", ["cat", "/etc/hostname"]),
   *     (result) => new TextDecoder().decode(result.stdout).trim()
   *   )
   * )
   * ```
   */
  readonly run: (
    container: string,
    cmd: ReadonlyArray<string>,
    options?: {
      readonly stdin?: string | Uint8Array | Stream.Stream<Uint8Array, DockerError> | undefined
      readonly env?: ReadonlyArray<string | Redacted.Redacted<string>> | undefined
      readonly workingDir?: string | undefined
      readonly user?: string | undefined
      readonly privileged?: boolean | undefined
      readonly tty?: boolean | undefined
    }
  ) => Effect.Effect<RunResult, DockerError>
}>()("effect/docker/DockerExec") {}

/**
 * Builds the {@link DockerExec} service over the `DockerEngine` in context.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const make: Effect.Effect<DockerExec["Service"], never, DockerEngine> = Effect.gen(function*() {
  const engine = yield* DockerEngine
  const api = yield* apiClient(engine, DockerApi.Exec, "docker.Exec")

  const create: DockerExec["Service"]["create"] = (container, config) =>
    api.create({
      params: { id: container },
      // the configured detach keys, unless the exec sets its own, as `docker exec` does
      payload: config.DetachKeys === undefined && engine.config.detachKeys !== undefined
        ? { ...config, DetachKeys: engine.config.detachKeys }
        : config
    })
  const inspect: DockerExec["Service"]["inspect"] = (id) => api.inspect({ params: { id } })
  const resize: DockerExec["Service"]["resize"] = (id, size) => api.resize({ params: { id }, query: size })

  const start: DockerExec["Service"]["start"] = Effect.fnUntraced(
    function*(id: string, options?: { readonly consoleSize?: DockerApi.TtySize | undefined }) {
      const info = yield* inspect(id)
      const tty = info.ProcessConfig?.tty === true
      const body: DockerSchema.ExecStartConfig = {
        Detach: false,
        Tty: tty,
        ...(options?.consoleSize !== undefined
          ? { ConsoleSize: [options.consoleSize.rows, options.consoleSize.columns] }
          : {})
      }
      return yield* releaseOnFailure(Effect.gen(function*() {
        const response = yield* engine.client.execute(
          HttpClientRequest.post(`/exec/${encodeURIComponent(id)}/start`).pipe(
            HttpClientRequest.bodyJsonUnsafe(body),
            HttpClientRequest.upgrade("tcp")
          )
        )
        const socket = yield* upgradeOf(response, "docker.Exec.start")
        return yield* makeHandle({
          engine,
          socket,
          framing: fromContentType(response.headers["content-type"]) ?? (tty ? "raw" : "multiplexed"),
          stdin: info.OpenStdin === true,
          exitCode: (outputDone) => Effect.andThen(outputDone, exitCodeWith(inspect, id)),
          resize: (size) => resize(id, size)
        })
      }))
    },
    (effect, id) => withOperation(engine, "docker.Exec.start", id)(effect)
  )

  return DockerExec.of({
    create,
    inspect,
    resize,
    start,
    run: Effect.fnUntraced(
      function*(container, cmd, options) {
        const { Id } = yield* create(container, {
          Cmd: cmd,
          AttachStdin: options?.stdin !== undefined,
          AttachStdout: true,
          AttachStderr: true,
          ...(options?.tty !== undefined ? { Tty: options.tty } : {}),
          ...(options?.env !== undefined ? { Env: options.env } : {}),
          ...(options?.workingDir !== undefined ? { WorkingDir: options.workingDir } : {}),
          ...(options?.user !== undefined ? { User: options.user } : {}),
          ...(options?.privileged !== undefined ? { Privileged: options.privileged } : {})
        })
        const exec = yield* start(Id)
        const input = options?.stdin
        const source = input === undefined
          ? undefined
          : typeof input === "string"
          ? Stream.make(new TextEncoder().encode(input))
          : input instanceof Uint8Array
          ? Stream.make(input)
          : input
        // An error of the caller's input fails `run` at once, without a half-close. The command
        // still sees the end of its stdin when the connection then closes, so what protects the
        // caller is that `run` fails. A write error of the connection is set aside: it means the
        // command stopped reading, which only counts as done once the command has exited.
        const writeStdin: Effect.Effect<Exit.Exit<void, DockerError>, DockerError> = source === undefined
          ? Effect.succeed(Exit.void)
          : Stream.run(Stream.mapError(source, (error) => new InputFailed(error)), exec.stdin).pipe(
            Effect.map(() => Exit.void),
            Effect.catch((error) =>
              error instanceof InputFailed ? Effect.fail(error.error) : Effect.succeed(Exit.fail(error))
            )
          )
        const stdout: Array<Uint8Array> = []
        const stderr: Array<Uint8Array> = []
        const collect = (stream: Stream.Stream<Uint8Array, DockerError>, into: Array<Uint8Array>) =>
          Stream.runForEach(stream, (chunk) => Effect.sync(() => into.push(chunk)))
        const outputEnded = yield* Deferred.make<void>()
        // each output stream is read to its end, even if the other fails first
        const output = Effect.all([
          Effect.exit(collect(exec.stdout, stdout)),
          Effect.exit(collect(exec.stderr, stderr))
        ], { concurrency: 2 }).pipe(Effect.ensuring(Deferred.succeed(outputEnded, undefined)))
        // once the output has ended, input that is still pending is dropped, as the Docker CLI does
        const [stdin, [stdoutExit, stderrExit]] = yield* Effect.all([
          Effect.raceFirst(writeStdin, Effect.as(Deferred.await(outputEnded), Exit.void)),
          output
        ], { concurrency: 2 })
        const failed = Exit.isFailure(stdoutExit) ? stdoutExit : Exit.isFailure(stderrExit) ? stderrExit : undefined
        const result = (exitCode: number): RunResult => ({ exitCode, stdout: concat(stdout), stderr: concat(stderr) })
        if (failed === undefined) return result(yield* exec.exitCode)
        // The command stopped reading its stdin and the connection then dropped (a write to a
        // closed connection can reset it): the exit code counts once the exec has stopped, which
        // the Engine may record a moment later. A connection that dropped while the command keeps
        // running is a real failure.
        const error = Cause.findErrorOption(failed.cause)
        if (Exit.isFailure(stdin) && error._tag === "Some" && error.value.reason._tag === "ConnectionFailed") {
          return result(yield* exitCodeWith(inspect, Id, error.value))
        }
        return yield* Effect.failCause(failed.cause)
      },
      Effect.scoped,
      (effect, container) => withOperation(engine, "docker.Exec.run", container)(effect)
    )
  })
})

/**
 * Provides {@link DockerExec} over the `DockerEngine` in context, built with
 * {@link make}. `Docker.layer` provides every service.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.6
 */
export const layer: Layer.Layer<DockerExec, never, DockerEngine> = Layer.effect(DockerExec, make)

// -----------------------------------------------------------------------------
// stream framing
// -----------------------------------------------------------------------------

/*
 * The Engine's stream framing for logs, attach and exec.
 *
 * Without a TTY the Engine multiplexes stdout and stderr: each frame has an
 * 8-byte header `[type, 0, 0, 0, size (uint32, big-endian)]` followed by `size`
 * bytes. Type 0 is stdin (written on stdout), 1 stdout, 2 stderr, 3 systemerr;
 * any other type is an error, as in moby's `stdcopy`. With a TTY the stream
 * is raw stdout.
 */

/**
 * How to read a stream: multiplexed frames, or raw stdout.
 *
 * @internal
 */
export type Framing = "multiplexed" | "raw"

/**
 * Picks the framing from a `Content-Type`, when it is one of the two stream
 * types. Any other content type, or none, decides nothing.
 *
 * @internal
 */
export const fromContentType = (contentType: string | undefined): Framing | undefined => {
  const type = contentType?.split(";")[0].trim().toLowerCase()
  return type === "application/vnd.docker.multiplexed-stream"
    ? "multiplexed"
    : type === "application/vnd.docker.raw-stream"
    ? "raw"
    : undefined
}

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
 * Turns a byte stream into frames with the given framing.
 *
 * @internal
 */
export const frames = <E, R>(
  bytes: Stream.Stream<Uint8Array, E, R>,
  framing: Framing
): Stream.Stream<LogFrame, E | DockerError, R> => {
  if (framing === "raw") return Stream.map(bytes, (data): LogFrame => ({ stream: "stdout", data }))
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

/**
 * The connection of an upgraded response. An error status fails as the
 * Engine's error response; any other response that didn't switch protocols is
 * an invalid response.
 */
const upgradeOf = (
  response: HttpClientResponse.HttpClientResponse,
  operation: string
): Effect.Effect<Socket.Socket, DockerError> =>
  response.status === 101
    ? Effect.mapError(
      response.upgrade,
      (cause) => new DockerError({ reason: new InvalidResponse({ issue: cause.message, operation, cause }) })
    )
    : Effect.andThen(
      filterStatus(operation)(response),
      Effect.fail(
        new DockerError({
          reason: new InvalidResponse({
            issue: `expected 101 Switching Protocols, got ${response.status}`,
            operation
          })
        })
      )
    )

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
  readonly framing: Framing
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
          if (options.framing === "raw") {
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
