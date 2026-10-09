/**
 * Backend-independent SSH connections.
 *
 * The `Ssh` service is a connection factory: `connect` opens a scoped
 * `SshConnection` to a destination, which runs commands, starts subsystems
 * such as SFTP, and opens tunnels. Connections are values owned by the code
 * that opens them and close with their scope, so programs decide when, where,
 * and how often to connect. Two backends provide the factory:
 *
 * - `SshClient.layer`, the built-in client running over `Socket` and the
 *   `Crypto` service.
 * - `OpenSsh.layer`, which drives the host's `ssh` executable and so uses the
 *   user's OpenSSH configuration, agent, and `known_hosts`.
 *
 * Code that depends only on `Ssh` works with either backend.
 *
 * **Example** (Connecting to several hosts)
 *
 * ```ts skip-type-checking
 * import { NodeServices } from "@effect/platform-node"
 * import { Effect, Layer } from "effect"
 * import { OpenSsh, Ssh } from "effect/ssh"
 *
 * const program = Effect.gen(function*() {
 *   const ssh = yield* Ssh.Ssh
 *   for (const host of ["web1", "web2"]) {
 *     const connection = yield* ssh.connect({ host })
 *     yield* connection.run("systemctl restart app")
 *   }
 * }).pipe(Effect.scoped)
 *
 * program.pipe(Effect.provide(OpenSsh.layer().pipe(Layer.provide(NodeServices.layer))))
 * ```
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import type * as Effect from "../Effect.ts"
import type * as Scope from "../Scope.ts"
import type * as Sink from "../Sink.ts"
import type * as Socket from "../socket/Socket.ts"
import type * as Stream from "../Stream.ts"
import * as Streams from "./internal/streams.ts"
import type { ForwardTarget, RunResult, SessionExit, SessionOptions, SshClient } from "./SshClient.ts"
import type { SshError } from "./SshError.ts"

/**
 * A bidirectional byte stream carried over SSH, such as a subsystem or a
 * forwarded connection.
 *
 * **Details**
 *
 * `stdout` and `stderr` can each be consumed once. `write` sends data,
 * `stdin` writes every chunk and then signals end of input, `eof` signals end
 * of input, and `close` tears the stream down.
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
}

/**
 * A remote command started with `Ssh.exec`.
 *
 * **Details**
 *
 * `exit` waits for the command to finish. `signal` delivers a signal when the
 * backend supports it (see `Capabilities.signals`) and fails with an
 * `SshRequestError` otherwise.
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
 * Features that differ between backends.
 *
 * **Details**
 *
 * - `signals`: `SshProcess.signal` delivers signals to remote commands.
 * - `exitSignals`: commands killed by a signal report an `ExitSignal`
 *   rather than an exit status.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Capabilities {
  readonly signals: boolean
  readonly exitSignals: boolean
}

/**
 * An open SSH connection, independent of the backend.
 *
 * **Details**
 *
 * - `exec` runs a command through the remote login shell; `run` runs one to
 *   completion and collects its output.
 * - `subsystem` starts a subsystem such as `sftp`.
 * - `forwardOut` opens a tunnel to a TCP target or Unix socket reachable from
 *   the server; `forwardOutSocket` exposes such tunnels as a
 *   `Socket.Socket`, and `forwardSocket` pipes a local socket through one.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface SshConnection {
  /**
   * A name identifying the backend, such as `effect` or `openssh`.
   */
  readonly backend: string
  readonly capabilities: Capabilities
  readonly exec: (command: string, options?: SessionOptions) => Effect.Effect<SshProcess, SshError, Scope.Scope>
  readonly run: (
    command: string,
    options?: SessionOptions & {
      readonly stdin?: Uint8Array | string | undefined
    }
  ) => Effect.Effect<RunResult, SshError>
  readonly subsystem: (name: string) => Effect.Effect<SshStream, SshError, Scope.Scope>
  readonly forwardOut: (target: ForwardTarget) => Effect.Effect<SshStream, SshError, Scope.Scope>
  readonly forwardOutSocket: (target: ForwardTarget) => Socket.Socket
  readonly forwardSocket: (
    socket: Socket.Socket,
    target: ForwardTarget
  ) => Effect.Effect<void, SshError | Socket.SocketError>
}

/**
 * Where to connect.
 *
 * **Details**
 *
 * `port` and `username` fall back to the backend's defaults (for OpenSSH,
 * the user's configuration).
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Destination {
  readonly host: string
  readonly port?: number | undefined
  readonly username?: string | undefined
}

/**
 * Service that opens SSH connections, independent of the backend.
 *
 * **Details**
 *
 * `connect` opens a connection that closes when the surrounding scope
 * closes. Backend layers (`SshClient.layer`, `OpenSsh.layer`) capture their
 * dependencies and defaults once, so `connect` has no further requirements.
 *
 * @stability experimental
 * @category services
 * @since 4.0.0
 */
export class Ssh extends Context.Service<Ssh, {
  readonly connect: (destination: Destination) => Effect.Effect<SshConnection, SshError, Scope.Scope>
}>()("effect/ssh/Ssh") {}

/**
 * Creates an `SshConnection` from a backend's primitive operations, deriving
 * `run`, `forwardOutSocket`, and `forwardSocket`.
 *
 * **When to use**
 *
 * Use to implement a custom backend, for example one that tunnels through
 * another transport.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const makeConnection = (impl: {
  readonly backend: string
  readonly capabilities: Capabilities
  readonly exec: SshConnection["exec"]
  readonly subsystem: SshConnection["subsystem"]
  readonly forwardOut: SshConnection["forwardOut"]
}): SshConnection => ({
  backend: impl.backend,
  capabilities: impl.capabilities,
  exec: impl.exec,
  run: Streams.run(impl.exec),
  subsystem: impl.subsystem,
  forwardOut: impl.forwardOut,
  forwardOutSocket: (target) => Streams.toSocket(impl.forwardOut(target)),
  forwardSocket: (socket, target) => Streams.pipeSocket(socket, impl.forwardOut(target))
})

/**
 * Adapts an `SshClient` to a backend-independent `SshConnection`.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const fromClient = (client: SshClient): SshConnection => ({
  backend: "effect",
  capabilities: { signals: true, exitSignals: true },
  exec: client.exec,
  run: client.run,
  subsystem: (name) => client.subsystem(name),
  forwardOut: client.forwardOut,
  forwardOutSocket: client.forwardOutSocket,
  forwardSocket: client.forwardSocket
})
