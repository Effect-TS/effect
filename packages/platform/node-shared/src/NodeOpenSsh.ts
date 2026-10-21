/**
 * An `Ssh` connection factory backed by an OpenSSH `ControlMaster`.
 *
 * Each connection starts the host's `ssh` executable once, as a connection
 * master. OpenSSH handles authentication, host key verification, proxies,
 * and algorithms using the user's configuration, agent, and `known_hosts`.
 * Commands, subsystems, and tunnels are then opened as SSH channels over the
 * master's control socket in multiplexing proxy mode (OpenSSH 7.4 or later),
 * without further `ssh` processes.
 *
 * Windows is not supported, because its OpenSSH port has no connection
 * multiplexing, so `connect` fails with a `Connection` error there.
 *
 * **Example** (Running remote commands with the system `ssh` on Node)
 *
 * ```ts skip-type-checking
 * import { NodeOpenSsh, NodeServices } from "@effect/platform-node"
 * import { Effect, Layer } from "effect"
 * import { Ssh, SshCommand } from "effect/ssh"
 *
 * const SshLive = NodeOpenSsh.layer.pipe(Layer.provide(NodeServices.layer))
 *
 * const program = Effect.gen(function*() {
 *   const ssh = yield* Ssh.Ssh
 *   // `host` may be a `Host` alias from ~/.ssh/config.
 *   const connection = yield* ssh.connect({
 *     host: "example.com",
 *     username: "deploy",
 *     openSsh: { options: { StrictHostKeyChecking: "yes" } }
 *   })
 *   const result = yield* connection.run(SshCommand.make`uptime`)
 *   yield* Effect.log(result.stdout)
 * }).pipe(Effect.scoped, Effect.provide(SshLive))
 * ```
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as Bytes from "effect/Bytes"
import * as Cause from "effect/Cause"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Host from "effect/net/Host"
import type * as NetAddress from "effect/net/NetAddress"
import * as ChildProcess from "effect/process/ChildProcess"
import { ChildProcessSpawner } from "effect/process/ChildProcessSpawner"
import * as Result from "effect/Result"
import * as Schedule from "effect/Schedule"
import * as Scope from "effect/Scope"
import * as Socket from "effect/socket/Socket"
import * as Ssh from "effect/ssh/Ssh"
import * as SshConnectionProtocol from "effect/ssh/SshConnectionProtocol"
import * as Stream from "effect/Stream"
import * as NodeSocket from "./NodeSocket.ts"

const connectionError = (description: string, cause?: unknown) =>
  new Ssh.SshError({ reason: "Connection", description, cause })

const protocolError = (description: string) => new Ssh.SshError({ reason: "Protocol", description })

const destinationFromInput = (
  input: Ssh.Destination["host"]
): Result.Result<{ readonly host: Host.Host; readonly port?: number | undefined }, NetAddress.NetAddressError> => {
  if (Host.isHostPort(input)) return Result.succeed(input)
  if (typeof input === "object" && "port" in input) return Host.hostPortFromInput(input)
  if (typeof input === "string") {
    const hostPort = Host.hostPortFromString(input)
    if (Result.isSuccess(hostPort)) return hostPort
  }
  return Result.map(Host.hostFromInput(input), (host) => ({ host }))
}

/**
 * Builds the arguments of the master's `ssh` invocation. Options listed first
 * take precedence, so the destination's settings come before the defaults.
 */
const baseArguments = (
  destination: Ssh.Destination,
  port: number | undefined
): Result.Result<Array<string>, Ssh.SshError> => {
  const args: Array<string> = []
  const settings = destination.openSsh ?? {}
  if (settings.configFile !== undefined) args.push("-F", settings.configFile)
  if (port !== undefined) args.push("-p", String(port))
  if (destination.username !== undefined) args.push("-l", destination.username)
  if (settings.identityFile !== undefined) args.push("-i", settings.identityFile)
  for (const [name, value] of Object.entries(settings.options ?? {})) {
    const text = typeof value === "boolean" ? (value ? "yes" : "no") : String(value)
    // An option is a single `ssh_config` line, with a keyword as its name.
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name) || /[\0\r\n]/.test(text)) {
      return Result.fail(connectionError(`invalid ssh option: ${JSON.stringify(name)}`))
    }
    args.push("-o", `${name}=${text}`)
  }
  // Commands only receive the agent when the master forwards it.
  if (destination.forwardAgent === true) args.push("-o", "ForwardAgent=yes")
  // `ssh` must fail instead of prompting for passwords or host keys, and
  // the forwardings of the user's configuration are left to their own `ssh`,
  // so concurrent masters do not compete for the same ports.
  args.push("-o", "BatchMode=yes", "-o", "ClearAllForwardings=yes", "-o", "LogLevel=ERROR")
  return Result.succeed(args)
}

/**
 * Formats a path as an `ssh_config` value that `ssh` neither splits at
 * spaces nor expands tokens in.
 */
const configPath = (path: string): Result.Result<string, Ssh.SshError> =>
  path.includes("\"")
    ? Result.fail(connectionError(`the path ${path} cannot be passed to ssh`))
    : Result.succeed(`"${path.replaceAll("%", "%%")}"`)

/**
 * Runs an effect in a child scope of the current scope, which is closed when
 * the effect fails, so failures release what the effect acquired.
 */
const inChildScope = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.flatMap(Effect.scope, (scope) =>
    Effect.flatMap(Scope.fork(scope), (child) =>
      effect.pipe(
        Scope.provide(child),
        Effect.onError((cause) => Scope.close(child, Exit.failCause(cause)))
      )))

// -----------------------------------------------------------------------------
// Multiplexing protocol (PROTOCOL.mux in the OpenSSH sources)
// -----------------------------------------------------------------------------

const MUX_MSG_HELLO = 0x00000001
const MUX_C_PROXY = 0x1000000f
const MUX_S_PROXY = 0x8000000f
const MUX_VERSION = 4

/** Larger than any SSH packet, so only a broken peer exceeds it. */
const MAX_FRAME = 1024 * 1024

const uint32 = (value: number) => {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, value)
  return bytes
}

/** Frames a message with its length, the framing of both the multiplexing protocol and proxy mode. */
const frame = (body: Uint8Array) => Bytes.concat([uint32(body.length), body])

/**
 * Reads length-prefixed frames, failing with `Cause.Done` when the master
 * closes the connection.
 */
const makeFrameReader = (pull: Effect.Effect<ReadonlyArray<Uint8Array>, Socket.SocketError>) => {
  let buffer = new Uint8Array(0)
  const next: Effect.Effect<Uint8Array, Ssh.SshError | Cause.Done> = Effect.suspend(() => {
    if (buffer.length >= 4) {
      const length = new DataView(buffer.buffer, buffer.byteOffset, 4).getUint32(0)
      if (length > MAX_FRAME) return Effect.fail(protocolError("the control socket sent an oversized frame"))
      if (buffer.length >= 4 + length) {
        const body = buffer.slice(4, 4 + length)
        buffer = buffer.subarray(4 + length)
        return Effect.succeed(body)
      }
    }
    return pull.pipe(
      Effect.mapError((cause) =>
        Socket.isSocketError(cause) && cause.reason._tag === "SocketCloseError"
          ? Cause.Done()
          : connectionError("could not read from the OpenSSH control socket", cause)
      ),
      Effect.flatMap((chunks) => {
        buffer = Bytes.concat([buffer, ...chunks])
        return next
      })
    )
  })
  return next
}

/** Reads the type and the following fields of a multiplexing message. */
const muxMessage = (body: Uint8Array) => {
  const view = new DataView(body.buffer, body.byteOffset, body.byteLength)
  const field = (offset: number) => offset + 4 <= body.length ? view.getUint32(offset) : undefined
  return { type: field(0), field }
}

/**
 * Connects to a master's control socket and reads the master's hello,
 * failing with a `Connection` error while the master does not accept
 * connections yet.
 */
const connectControl = Effect.fnUntraced(function*(socket: Socket.Socket) {
  const pull = yield* Socket.readerBytes(socket).pipe(
    Effect.mapError((cause) => connectionError("could not connect to the OpenSSH control socket", cause))
  )
  const writer = yield* socket.writer
  const read = makeFrameReader(pull)
  const readMux = read.pipe(
    Effect.catchIf(Cause.isDone, () => Effect.fail(connectionError("the OpenSSH master closed the connection"))),
    Effect.map(muxMessage)
  )
  const write = (body: Uint8Array) =>
    Effect.mapError(
      writer.write(frame(body)),
      (cause) => connectionError("could not write to the OpenSSH control socket", cause)
    )
  const hello = yield* readMux
  return { read, readMux, write, hello }
})

/**
 * Switches a control connection to proxy mode (PROTOCOL.mux section 9), in
 * which it carries unencrypted SSH connection-protocol messages.
 */
const openProxy = Effect.fnUntraced(function*(
  { hello, read, readMux, write }: Effect.Success<ReturnType<typeof connectControl>>
) {
  if (hello.type !== MUX_MSG_HELLO || hello.field(4) !== MUX_VERSION) {
    return yield* Effect.fail(protocolError(`unsupported OpenSSH multiplexing protocol version ${hello.field(4)}`))
  }
  yield* write(Bytes.concat([uint32(MUX_MSG_HELLO), uint32(MUX_VERSION)]))
  yield* write(Bytes.concat([uint32(MUX_C_PROXY), uint32(0)]))
  const reply = yield* readMux
  if (reply.type !== MUX_S_PROXY) {
    return yield* Effect.fail(connectionError("the OpenSSH master refused proxy mode"))
  }

  // Proxy frames are unpadded SSH packets: a zero padding length, then the
  // message.
  return {
    send: (message: Uint8Array) => write(Bytes.concat([Uint8Array.of(0), message])),
    messages: Stream.fromEffectRepeat(Effect.flatMap(read, (body) =>
      body.length < 2 || body[0] !== 0
        ? Effect.fail(protocolError("the OpenSSH master sent a malformed proxy frame"))
        : Effect.succeed(body.subarray(1))))
  }
})

/**
 * An `Ssh` connection factory backed by the host's `ssh` executable.
 *
 * **Details**
 *
 * `connect` starts `ssh` from the `PATH` as a connection master with a
 * private control socket, and succeeds once the master accepts connections
 * on it. `username` becomes `-l`; the destination's `openSsh.configFile`,
 * `openSsh.identityFile`, and `openSsh.options` become `-F`, `-i`, and
 * `-o Name=value`, respectively. Option values use `ssh_config` syntax.
 * `BatchMode=yes` applies unless `openSsh.options` sets `BatchMode`, so
 * `ssh` fails instead of prompting for passwords or host keys.
 * `ClearAllForwardings=yes` prevents the master from opening port
 * forwardings from the user's configuration. Authentication or host key
 * failures produce a `Connection` error with the `ssh` diagnostics. Closing
 * the scope stops the master. The connection's `closed` completes when the
 * scope closes or the master exits, for example because the server went away.
 *
 * Commands, subsystems, and tunnels are SSH channels over the control socket,
 * run with `SshConnectionProtocol.toSshConnection`. With the destination's
 * `forwardAgent`, the master forwards the agent (`ForwardAgent=yes`) and each
 * command requests it. OpenSSH servers deliver signals to the command's
 * process group unless the command is forced by their configuration.
 *
 * **Gotchas**
 *
 * - Output that is not consumed stops the command once the channel's
 *   window, two megabytes, is full, like a full pipe. Standard output and
 *   standard error share the window, so both must be consumed.
 * - All commands, subsystems, and tunnels of a connection share it, and
 *   OpenSSH servers limit the sessions of a connection (`MaxSessions`,
 *   default 10); further sessions fail with a `Channel` error. A closed
 *   session whose command keeps running still counts until the command
 *   exits.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make: Effect.Effect<Ssh.Ssh["Service"], never, ChildProcessSpawner | FileSystem.FileSystem> = Effect
  .gen(function*() {
    const spawner = yield* ChildProcessSpawner
    const fs = yield* FileSystem.FileSystem

    /**
     * Starts the master and connects to its control socket, which it opens
     * once authenticated.
     */
    const startMaster = Effect.fnUntraced(function*(
      args: ReadonlyArray<string>,
      host: string,
      timeout: Duration.Input
    ) {
      const directory = yield* fs.makeTempDirectoryScoped({ prefix: "effect-ssh-" }).pipe(
        Effect.mapError((cause) => connectionError("could not create the control socket directory", cause))
      )
      const controlPath = `${directory}/control`
      const master = yield* spawner.spawn(
        ChildProcess.make("ssh", [
          "-o",
          `ControlPath=${yield* Effect.fromResult(configPath(controlPath))}`,
          "-o",
          "ControlMaster=yes",
          "-o",
          "ControlPersist=no",
          ...args,
          "-N",
          "-T",
          host
        ], { stdin: "ignore", stdout: "ignore" })
      ).pipe(Effect.mapError((cause) => connectionError("could not start ssh", cause)))

      // Keep the last part of the master's diagnostics for error reports.
      let diagnostics = ""
      const decoder = new TextDecoder()
      const collector = yield* Stream.runForEach(master.stderr, (chunk) =>
        Effect.sync(() => {
          diagnostics = (diagnostics + decoder.decode(chunk, { stream: true })).slice(-4096)
        })).pipe(Effect.ignore, Effect.forkScoped)

      // Retry until the master authenticates and opens its control socket.
      // A child scope releases each failed attempt's socket.
      const socket = yield* NodeSocket.makeNet({ path: controlPath })
      const connected = inChildScope(connectControl(socket)).pipe(
        Effect.retry({
          while: (error) => error.reason === "Connection",
          schedule: Schedule.spaced(Duration.millis(25))
        }),
        Effect.flatMap(openProxy)
      )
      // The master's stderr ends with the process; collect all of it,
      // unless a process the master started keeps it open.
      const awaitDiagnostics = Effect.timeoutOption(Fiber.await(collector), Duration.seconds(1))
      const withDiagnostics = (description: string) => [description, diagnostics.trim()].filter(Boolean).join(": ")
      const exited = master.exitCode.pipe(
        Effect.ignore,
        Effect.andThen(awaitDiagnostics),
        Effect.andThen(() => Effect.fail(connectionError(diagnostics.trim() || "ssh exited before connecting")))
      )
      const proxy = yield* Effect.raceFirst(connected, exited).pipe(
        Effect.timeoutOrElse({
          duration: timeout,
          // The master may have reported why, for example that it could not
          // create the control socket.
          orElse: () =>
            Effect.fail(
              new Ssh.SshError({
                reason: "Timeout",
                description: withDiagnostics("the OpenSSH connection did not start in time")
              })
            )
        })
      )
      const closed = Effect.andThen(
        awaitDiagnostics,
        () => Effect.fail(connectionError(withDiagnostics("the OpenSSH master closed the connection")))
      )
      const messages = proxy.messages.pipe(
        Stream.catch((error) =>
          Stream.fromEffect(Effect.andThen(
            awaitDiagnostics,
            () =>
              Effect.fail(
                error.reason === "Connection" ? connectionError(withDiagnostics(error.description), error.cause) : error
              )
          ))
        ),
        Stream.concat(Stream.fromEffect(closed))
      )
      return { send: proxy.send, messages }
    })

    const connect = (destination: Ssh.Destination): Effect.Effect<Ssh.SshConnection, Ssh.SshError, Scope.Scope> =>
      // A failed connect releases the master and its files at once, rather
      // than with the caller's scope.
      inChildScope(Effect.gen(function*() {
        if (globalThis.process.platform === "win32") {
          return yield* Effect.fail(connectionError("OpenSSH connection multiplexing is not supported on Windows"))
        }
        // Host names cannot start with `-`, which `ssh` would read as an
        // option even in the destination position.
        const address = yield* Effect.mapError(
          Effect.fromResult(destinationFromInput(destination.host)),
          (error) => connectionError(`invalid destination host: ${error.message}`, error)
        )
        const proxy = yield* startMaster(
          yield* Effect.fromResult(baseArguments(destination, address.port)),
          Host.formatHost(address.host),
          destination.connectTimeout ?? Duration.seconds(30)
        )
        const protocol = yield* SshConnectionProtocol.make()
        // The protocol fails the connection's open channels when the pump
        // fails, so the pump's own result is not needed.
        yield* proxy.messages.pipe(
          Stream.pipeThroughChannel(protocol.channel),
          Stream.runForEach(proxy.send),
          Effect.ignore,
          Effect.forkScoped
        )
        return SshConnectionProtocol.toSshConnection(protocol, { forwardAgent: destination.forwardAgent })
      }))

    return Ssh.Ssh.of({ connect })
  })

/**
 * Layer that provides the `Ssh` connection factory through the host's `ssh`
 * executable.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Ssh.Ssh, never, ChildProcessSpawner | FileSystem.FileSystem> = Layer.effect(
  Ssh.Ssh,
  make
)
