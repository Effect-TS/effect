/**
 * Backend-independent SSH connections.
 *
 * The `Ssh` service is a connection factory: `connect` opens a scoped
 * `SshConnection` to a destination, which runs commands, starts subsystems,
 * and opens tunnels. Connections are values owned by the code
 * that opens them and close with their scope, so programs decide when, where,
 * and how often to connect.
 *
 * Backends provide the factory. `NodeOpenSsh.layer` from
 * `@effect/platform-node` (`BunOpenSsh` on Bun) connects through an OpenSSH
 * connection master started with the host's `ssh` executable, and so uses
 * the user's OpenSSH configuration, agent, and `known_hosts`.
 * Backends whose transport carries SSH connection-protocol messages build
 * their connections with `SshConnectionProtocol.toSshConnection`, and others
 * from their own operations with `makeConnection`.
 * Code that depends only on `Ssh` works with any backend.
 *
 * **Example** (Connecting to several hosts)
 *
 * ```ts skip-type-checking
 * import { NodeOpenSsh, NodeServices } from "@effect/platform-node"
 * import { Effect, Layer } from "effect"
 * import { Ssh, SshCommand } from "effect/ssh"
 *
 * const program = Effect.gen(function*() {
 *   const ssh = yield* Ssh.Ssh
 *   for (const host of ["web1", "web2"]) {
 *     // Each connection closes once its host is done.
 *     yield* Effect.scoped(Effect.gen(function*() {
 *       const connection = yield* ssh.connect({ host })
 *       yield* connection.run(SshCommand.make`systemctl restart app`)
 *     }))
 *   }
 * })
 *
 * program.pipe(Effect.provide(NodeOpenSsh.layer.pipe(Layer.provide(NodeServices.layer))))
 * ```
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as Cause from "../Cause.ts"
import * as Context from "../Context.ts"
import * as Data from "../Data.ts"
import type * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Latch from "../Latch.ts"
import type * as Host from "../net/Host.ts"
import type * as NetAddress from "../net/NetAddress.ts"
import * as Pull from "../Pull.ts"
import type * as Scope from "../Scope.ts"
import type * as Sink from "../Sink.ts"
import * as Socket from "../socket/Socket.ts"
import * as Stream from "../Stream.ts"
import * as SshCommand from "./SshCommand.ts"

/**
 * How a remote command terminated.
 *
 * **Details**
 *
 * `ExitSignal` names the signal with its `SIG` prefix, such as `SIGTERM`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type SessionExit =
  | {
    readonly _tag: "ExitStatus"
    readonly code: number
  }
  | {
    readonly _tag: "ExitSignal"
    readonly signal: string
    readonly coreDumped: boolean
    readonly message: string
  }

/**
 * Pseudo-terminal settings for a command.
 *
 * **Details**
 *
 * `term` sets the terminal type (`TERM`).
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface PtyOptions {
  readonly term?: string | undefined
}

/**
 * Options for the session of a remote command.
 *
 * **Details**
 *
 * `pty` allocates a pseudo-terminal, which merges standard error into
 * standard output. Writing `"\x03"` then interrupts the command like Ctrl-C,
 * and servers hang up the command when its session closes.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface ExecOptions {
  readonly pty?: boolean | PtyOptions | undefined
}

/**
 * Options for running a remote command to completion with
 * `SshConnection.run`.
 *
 * **Details**
 *
 * `stdin` is written to the command's standard input before it is closed.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface RunOptions extends ExecOptions {
  readonly stdin?: Uint8Array | string | undefined
}

/**
 * The collected result of `SshConnection.run`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface RunResult {
  readonly stdout: string
  readonly stderr: string
  readonly exit: SessionExit
}

/**
 * A destination reached through the server: a TCP endpoint or a Unix domain
 * socket path on the server.
 *
 * **Details**
 *
 * TCP endpoints are converted like `Host.hostPortFromInput`, so a
 * `Host.HostPort`, a `host:port` string, or `{ host, port }` parts are
 * accepted; the server resolves the host. Unix socket paths are given as a
 * `NetAddress.UnixPathAddress` or `{ path }`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type ForwardTarget =
  | Host.HostPortInput
  | NetAddress.UnixPathAddress
  | NetAddress.UnixPathAddressParts

/**
 * A bidirectional byte stream carried over SSH, such as a subsystem or a
 * forwarded connection.
 *
 * **Details**
 *
 * `stdout` and `stderr` can each be consumed once. They share one
 * flow-control window, so output that is not consumed, on either of them,
 * eventually stops the remote side from sending. `write` sends data,
 * `stdin` writes every chunk and then signals end of input, `eof` signals end
 * of input once pending writes are sent, `close` tears the stream down, and
 * `closed` waits until it is torn down, by either side or with the
 * connection. Concurrent writes are sent one after another, and an
 * interrupted write may have sent part of its data.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface SshStream {
  readonly stdout: Stream.Stream<Uint8Array, SshError>
  readonly stderr: Stream.Stream<Uint8Array, SshError>
  readonly stdin: Sink.Sink<void, Uint8Array, never, SshError>
  readonly write: (data: Uint8Array | string) => Effect.Effect<void, SshError>
  readonly eof: Effect.Effect<void, SshError>
  readonly close: Effect.Effect<void>
  readonly closed: Effect.Effect<void>
}

/**
 * A remote command started with `SshConnection.exec`.
 *
 * **Details**
 *
 * `exit` waits for the command to finish. `signal` asks the server to
 * deliver a signal such as `SIGTERM`. Servers may ignore it, for example for
 * commands forced by their configuration, so delivery is not confirmed.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface SshProcess extends SshStream {
  readonly exit: Effect.Effect<SessionExit, SshError>
  readonly signal: (signal: string) => Effect.Effect<void, SshError>
}

/**
 * An open SSH connection, independent of the backend.
 *
 * **Details**
 *
 * - `exec` runs an `SshCommand`; `run` runs one to completion and collects
 *   its output, writing `stdin` first.
 * - `subsystem` starts a subsystem such as `sftp`.
 * - `forwardOut` opens a tunnel to a TCP target or Unix socket reachable from
 *   the server; `forwardOutSocket` exposes such tunnels as a
 *   `Socket.Socket`, and `forwardSocket` pipes a local socket through one,
 *   in both directions, until both sides have ended their data or the tunnel
 *   closes. Each side's end of data is passed on to the other, like a
 *   half-closed TCP connection.
 *
 * **Gotchas**
 *
 * - The remote login shell interprets each command line, so it must accept
 *   POSIX quoting; arguments are quoted unless `shell` is set. Each part of
 *   a pipeline runs in its own subshell, so pipelines need a POSIX-compatible
 *   login shell, such as `sh`, `bash`, or `zsh`, rather than fish.
 * - Closing a command's scope closes its session. Without a pty, the remote
 *   command then keeps running until it reads its closed input or writes to
 *   its closed output, and servers may count its session against their
 *   limit until then; use `signal` to stop it first.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface SshConnection {
  readonly exec: (
    command: SshCommand.SshCommand,
    options?: ExecOptions
  ) => Effect.Effect<SshProcess, SshError, Scope.Scope>
  readonly run: (command: SshCommand.SshCommand, options?: RunOptions) => Effect.Effect<RunResult, SshError>
  readonly subsystem: (name: string) => Effect.Effect<SshStream, SshError, Scope.Scope>
  readonly forwardOut: (target: ForwardTarget) => Effect.Effect<SshStream, SshError, Scope.Scope>
  readonly forwardOutSocket: (target: ForwardTarget) => Socket.Socket
  readonly forwardSocket: (
    socket: Socket.Socket,
    target: ForwardTarget
  ) => Effect.Effect<void, SshError | Socket.SocketError>
}

/**
 * Where and how to connect.
 *
 * **Details**
 *
 * - `host` is the server, with or without a port. A `Host.HostPort`,
 *   `{ host, port }` parts, or a `host:port` string is converted like
 *   `Host.hostPortFromInput`; any other value is a host alone, converted
 *   like `Host.hostFromInput`.
 * - `username` and `identityFile` choose the user and the private key.
 * - `options` are settings in the form of `ssh_config` keywords, such as
 *   `{ StrictHostKeyChecking: "yes", UserKnownHostsFile: "/path" }`;
 *   booleans mean `yes` / `no`. Values use `ssh_config` syntax, so
 *   whitespace separates the values of keywords such as `SendEnv`, and
 *   double quotes keep a value with spaces together. They take precedence
 *   over `configFile` and the backend's defaults.
 * - `configFile` is an `ssh_config` file read instead of the user's
 *   configuration, such as `/dev/null` to ignore it.
 * - `connectTimeout` (default 30 seconds) bounds establishing the
 *   connection.
 * - `forwardAgent` forwards the local SSH agent to every command. Servers
 *   may offer it to later commands on the connection as well, and commands
 *   run without it when the server refuses it.
 *
 * Settings that are not given fall back to the backend's configuration; for
 * OpenSSH, the user's configuration, so `host` may be a `Host` alias from it
 * that is also a valid host name.
 * Backends may support only some `options`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Destination {
  readonly host: Host.HostInput | Host.HostPortInput
  readonly username?: string | undefined
  readonly identityFile?: string | undefined
  readonly options?: Readonly<Record<string, string | number | boolean>> | undefined
  readonly configFile?: string | undefined
  readonly connectTimeout?: Duration.Input | undefined
  readonly forwardAgent?: boolean | undefined
}

/**
 * The normalized reason for a failed SSH operation.
 *
 * **Details**
 *
 * - `Connection`: the connection could not be established or was lost, for
 *   example because authentication or host key verification failed.
 * - `Protocol`: the server sent a malformed or unexpected message.
 * - `Channel`: an operation on a command, subsystem, or tunnel failed, for
 *   example because it has closed or the backend does not support it.
 * - `Timeout`: the connection did not start in time.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export type SshErrorReason = "Connection" | "Protocol" | "Channel" | "Timeout"

/**
 * A failed SSH operation.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class SshError extends Data.TaggedError("SshError")<{
  readonly reason: SshErrorReason
  readonly description: string
  readonly cause?: unknown
}> {
  /**
   * Formats the reason and description of the failure.
   *
   * @since 4.0.0
   */
  override get message(): string {
    return `${this.reason}: ${this.description}`
  }
}

/**
 * Service that opens SSH connections, independent of the backend.
 *
 * **Details**
 *
 * `connect` opens a connection that closes when the surrounding scope
 * closes. Backend layers such as `NodeOpenSsh.layer` capture their dependencies
 * and defaults once, so `connect` has no further requirements.
 *
 * @stability experimental
 * @category services
 * @since 4.0.0
 */
export class Ssh extends Context.Service<Ssh, {
  readonly connect: (destination: Destination) => Effect.Effect<SshConnection, SshError, Scope.Scope>
}>()("effect/ssh/Ssh") {}

/**
 * Exposes streams opened on demand as a `Socket.Socket`. Every reader
 * acquisition opens a new stream.
 */
const toSocket = (open: Effect.Effect<SshStream, SshError, Scope.Scope>): Socket.Socket => {
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
        if (current !== stream) return
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

/** Whether a socket error is the peer's normal end of data. */
const isCleanClose = (error: Socket.SocketError) =>
  error.reason._tag === "SocketCloseError" && error.reason.code === 1000

/**
 * Pipes a local socket to a stream in both directions. Each direction ends
 * on its own, like a half-closed TCP connection: the local end of data
 * becomes the stream's `eof`, and the stream's end of data closes the
 * socket's writer. Closing the stream ends both, and local data that
 * arrives afterwards is discarded.
 */
const pipeSocket = (
  local: Socket.Socket,
  open: Effect.Effect<SshStream, SshError, Scope.Scope>
): Effect.Effect<void, SshError | Socket.SocketError> =>
  Effect.scoped(Effect.gen(function*() {
    // The local connection is acquired first, so it closes with the scope
    // when the stream cannot be opened.
    const pull = yield* Socket.readerBytes(local)
    const stream = yield* open
    const upload = Effect.forever(
      Effect.flatMap(pull, (chunks) => Effect.forEach(chunks, (chunk) => stream.write(chunk), { discard: true }))
    ).pipe(
      Effect.catchIf(
        (error): error is Socket.SocketError => Socket.isSocketError(error) && isCleanClose(error),
        () => stream.eof
      ),
      // Writes fail with a `Channel` error once the stream is closed.
      Effect.catchIf((error) => error._tag === "SshError" && error.reason === "Channel", () => Effect.void),
      // A local peer that neither sends nor closes would otherwise keep a
      // closed stream's forwarding alive.
      Effect.raceFirst(stream.closed)
    )
    const download = Effect.scoped(
      Effect.flatMap(local.writer, (writer) => Stream.runForEach(stream.stdout, (chunk) => writer.write(chunk)))
    )
    yield* Effect.all([upload, download], { concurrency: 2, discard: true })
  }))

const collect = (stream: Stream.Stream<Uint8Array, SshError>) => Stream.mkString(Stream.decodeText(stream))

/**
 * Creates an `SshConnection` from a backend's primitive operations, deriving
 * `run`, `forwardOutSocket`, and `forwardSocket`.
 *
 * **When to use**
 *
 * Use to implement a backend whose transport does not carry SSH
 * connection-protocol messages; otherwise use
 * `SshConnectionProtocol.toSshConnection`.
 *
 * **Details**
 *
 * The backend's `exec` receives the command line to run, built with
 * `SshCommand.render`, and allocates a pseudo-terminal when `pty` is
 * set.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const makeConnection = (impl: {
  readonly exec: (
    commandLine: string,
    options: { readonly pty?: boolean | PtyOptions | undefined }
  ) => Effect.Effect<SshProcess, SshError, Scope.Scope>
  readonly subsystem: SshConnection["subsystem"]
  readonly forwardOut: SshConnection["forwardOut"]
}): SshConnection => {
  const exec: SshConnection["exec"] = (command, options) =>
    Effect.flatMap(
      Effect.try({
        try: () => SshCommand.render(command),
        catch: (cause) =>
          new SshError({ reason: "Channel", description: `invalid command: ${(cause as Error).message}`, cause })
      }),
      (commandLine) => impl.exec(commandLine, { pty: options?.pty })
    )
  return {
    exec,
    run: (command, options) =>
      Effect.scoped(Effect.gen(function*() {
        const process = yield* exec(command, options)
        // Input is written while output is collected, so neither side waits
        // for the other once a window is full. Commands may exit without
        // reading their input, so failed writes leave the result to `exit`.
        const input = Effect.andThen(
          options?.stdin === undefined ? Effect.void : process.write(options.stdin),
          process.eof
        ).pipe(Effect.ignore)
        const [, stdout, stderr] = yield* Effect.all([input, collect(process.stdout), collect(process.stderr)], {
          concurrency: "unbounded"
        })
        return { stdout, stderr, exit: yield* process.exit }
      })),
    subsystem: impl.subsystem,
    forwardOut: impl.forwardOut,
    forwardOutSocket: (target) => toSocket(impl.forwardOut(target)),
    forwardSocket: (socket, target) => pipeSocket(socket, impl.forwardOut(target))
  }
}
