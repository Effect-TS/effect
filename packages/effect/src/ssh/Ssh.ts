/**
 * A backend-independent SSH service.
 *
 * `Ssh` describes what SFTP, the remote `ChildProcessSpawner`, and port
 * forwarding need from an SSH connection: running commands, starting
 * subsystems, and opening tunnels. Two backends provide it:
 *
 * - `SshClient`, the built-in client (`SshClient.layer` provides both
 *   `SshClient` and `Ssh`, and `Ssh.fromClient` adapts an existing client).
 * - `OpenSsh`, which drives the host's `ssh` executable and so uses the
 *   user's OpenSSH configuration, agent, and `known_hosts`.
 *
 * Code that depends only on `Ssh` works with either backend.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import type * as Effect from "../Effect.ts"
import * as Predicate from "../Predicate.ts"
import type * as Scope from "../Scope.ts"
import type * as Sink from "../Sink.ts"
import type * as Socket from "../socket/Socket.ts"
import type * as Stream from "../Stream.ts"
import * as Streams from "./internal/streams.ts"
import type { ForwardTarget, RunResult, SessionExit, SessionOptions, SshClient } from "./SshClient.ts"
import type { SshError } from "./SshError.ts"

/**
 * Type identifier attached to `Ssh` values.
 *
 * @stability experimental
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId = "~effect/ssh/Ssh"

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
 * Service for running commands, subsystems, and tunnels over an SSH
 * connection, independent of the backend.
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
export interface Ssh {
  readonly [TypeId]: typeof TypeId
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
 * Service tag for the backend-independent SSH service.
 *
 * @stability experimental
 * @category services
 * @since 4.0.0
 */
export const Ssh: Context.Service<Ssh, Ssh> = Context.Service<Ssh>("effect/ssh/Ssh")

/**
 * Returns `true` when a value is an `Ssh` service.
 *
 * @stability experimental
 * @category guards
 * @since 4.0.0
 */
export const isSsh = (u: unknown): u is Ssh => Predicate.hasProperty(u, TypeId)

/**
 * Creates an `Ssh` service from a backend's primitive operations, deriving
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
export const make = (impl: {
  readonly backend: string
  readonly capabilities: Capabilities
  readonly exec: Ssh["exec"]
  readonly subsystem: Ssh["subsystem"]
  readonly forwardOut: Ssh["forwardOut"]
}): Ssh => ({
  [TypeId]: TypeId,
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
 * Adapts an `SshClient` to the `Ssh` service.
 *
 * **Details**
 *
 * `SshClient.layer` already provides `Ssh` alongside `SshClient`; use this
 * when the client was created with `SshClient.make`.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const fromClient = (client: SshClient): Ssh => ({
  [TypeId]: TypeId,
  backend: "effect",
  capabilities: { signals: true, exitSignals: true },
  exec: client.exec,
  run: client.run,
  subsystem: (name) => client.subsystem(name),
  forwardOut: client.forwardOut,
  forwardOutSocket: client.forwardOutSocket,
  forwardSocket: client.forwardSocket
})
