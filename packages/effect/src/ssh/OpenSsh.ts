/**
 * An `Ssh` connection factory that drives the host's OpenSSH `ssh`
 * executable through `ChildProcessSpawner`.
 *
 * Authentication, host key verification, proxies, and algorithms are left to
 * `ssh` itself, so the user's `~/.ssh/config`, agent, `known_hosts`,
 * certificates, security keys, and passphrase-protected keys all work. By
 * default each connection opens one multiplexed `ssh` connection
 * (`ControlMaster`) shared by every command, subsystem, and tunnel on it, so
 * operations avoid a new handshake.
 *
 * **Example** (Running remote commands with the system `ssh` on Node)
 *
 * ```ts skip-type-checking
 * import { NodeServices } from "@effect/platform-node"
 * import { Effect, Layer } from "effect"
 * import { OpenSsh, Ssh } from "effect/ssh"
 *
 * const SshLive = OpenSsh.layer().pipe(Layer.provide(NodeServices.layer))
 *
 * const program = Effect.gen(function*() {
 *   const ssh = yield* Ssh.Ssh
 *   // `host` may be a `Host` alias from ~/.ssh/config.
 *   const connection = yield* ssh.connect({ host: "deploy@example.com" })
 *   const result = yield* connection.run("uptime")
 *   yield* Effect.log(result.stdout)
 * }).pipe(Effect.scoped, Effect.provide(SshLive))
 * ```
 *
 * @stability experimental
 * @since 4.0.0
 */
import type * as Cause from "../Cause.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Fiber from "../Fiber.ts"
import * as FileSystem from "../FileSystem.ts"
import * as Layer from "../Layer.ts"
import type * as PlatformError from "../PlatformError.ts"
import * as ChildProcess from "../process/ChildProcess.ts"
import { ChildProcessSpawner } from "../process/ChildProcessSpawner.ts"
import * as Queue from "../Queue.ts"
import type * as Scope from "../Scope.ts"
import * as Sink from "../Sink.ts"
import * as Stream from "../Stream.ts"
import { utf8 } from "./internal/wire.ts"
import * as Ssh from "./Ssh.ts"
import type { ForwardTarget, SessionOptions } from "./SshClient.ts"
import { SshChannelError, SshConnectionError, SshError, SshTimeoutError } from "./SshError.ts"

/**
 * Defaults for every connection opened by the OpenSSH backend.
 *
 * **Details**
 *
 * - A `Destination`'s `host` is passed to `ssh` and may be a `Host` alias
 *   from the user's configuration or `user@host`; its `port` and `username`
 *   override `port` and `user`.
 * - `options` become `-o Name=value` arguments (booleans are written as
 *   `yes` / `no`) and take precedence over the defaults below.
 * - `args` are appended to every `ssh` invocation, for example
 *   `["-F", "/path/to/config"]`.
 * - `executable` defaults to `ssh`.
 * - `batchMode` (default `true`) sets `BatchMode=yes` so `ssh` fails instead
 *   of prompting for passwords or host key confirmation.
 * - `multiplex` (default `true`) shares one `ControlMaster` connection per
 *   `connect`; disable it where connection sharing is unavailable, such as
 *   Windows.
 * - `connectTimeout` (default 30 seconds) bounds establishing a shared
 *   connection.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Options {
  readonly user?: string | undefined
  readonly port?: number | undefined
  readonly identityFile?: string | undefined
  readonly options?: Readonly<Record<string, string | number | boolean>> | undefined
  readonly args?: ReadonlyArray<string> | undefined
  readonly executable?: string | undefined
  readonly batchMode?: boolean | undefined
  readonly multiplex?: boolean | undefined
  readonly connectTimeout?: Duration.Input | undefined
}

const connectionError = (cause: unknown) => new SshError({ reason: new SshConnectionError({ cause }) })

const closedError = () => new SshError({ reason: new SshChannelError({ description: "the ssh process has exited" }) })

const quoteConfigValue = (value: string) => `"${value.replace(/[\\"]/g, (char) => `\\${char}`)}"`

/**
 * Builds the arguments shared by every `ssh` invocation. Options listed first
 * take precedence, so user options come before the defaults.
 */
const baseArguments = (options: Options): Array<string> => {
  const args: Array<string> = []
  if (options.port !== undefined) args.push("-p", String(options.port))
  if (options.user !== undefined) args.push("-l", options.user)
  if (options.identityFile !== undefined) args.push("-i", options.identityFile)
  for (const [name, value] of Object.entries(options.options ?? {})) {
    args.push("-o", `${name}=${typeof value === "boolean" ? (value ? "yes" : "no") : value}`)
  }
  if (options.batchMode !== false) args.push("-o", "BatchMode=yes")
  args.push("-o", "LogLevel=ERROR")
  args.push(...(options.args ?? []))
  return args
}

/**
 * Starts an `ssh` process and exposes it as an `SshProcess`.
 */
const spawnProcess = Effect.fnUntraced(function*(
  spawner: ChildProcessSpawner["Service"],
  executable: string,
  args: ReadonlyArray<string>,
  env?: Record<string, string> | undefined
): Effect.fn.Return<Ssh.SshProcess, SshError, Scope.Scope> {
  const input = yield* Queue.bounded<Uint8Array, Cause.Done>(16)
  const handle = yield* spawner.spawn(
    ChildProcess.make(executable, args, {
      stdin: Stream.fromQueue(input),
      ...(env === undefined ? {} : { env, extendEnv: true })
    })
  ).pipe(Effect.mapError(connectionError))
  const lift = (error: PlatformError.PlatformError) => connectionError(error)
  const write = (data: Uint8Array | string) =>
    Effect.flatMap(
      Queue.offer(input, typeof data === "string" ? utf8(data) : data),
      (accepted) => accepted ? Effect.void : Effect.fail(closedError())
    )
  const eof = Effect.asVoid(Queue.end(input))
  return {
    stdout: Stream.mapError(handle.stdout, lift),
    stderr: Stream.mapError(handle.stderr, lift),
    stdin: Sink.forEach(write).pipe(Sink.mapEffect(() => eof)),
    write,
    eof,
    close: Effect.andThen(Queue.end(input), Effect.ignore(handle.kill())),
    exit: handle.exitCode.pipe(
      Effect.map((code) => ({ _tag: "ExitStatus", code }) as const),
      Effect.mapError(lift)
    ),
    signal: () =>
      Effect.fail(
        new SshError({
          reason: new SshChannelError({ description: "the OpenSSH backend cannot deliver signals" })
        })
      )
  }
})

/**
 * Starts the shared `ControlMaster` connection and waits until it accepts
 * multiplexed sessions.
 */
const startMaster = Effect.fnUntraced(function*(
  spawner: ChildProcessSpawner["Service"],
  fs: FileSystem.FileSystem,
  executable: string,
  base: ReadonlyArray<string>,
  host: string,
  timeout: Duration.Input
) {
  const directory = yield* fs.makeTempDirectoryScoped({ prefix: "effect-ssh-" }).pipe(
    Effect.mapError(connectionError)
  )
  const controlPath = `${directory}/control`
  const master = yield* spawner.spawn(
    ChildProcess.make(executable, [
      "-o",
      `ControlPath=${controlPath}`,
      "-o",
      "ControlMaster=yes",
      "-o",
      "ControlPersist=no",
      ...base,
      "-N",
      "-T",
      host
    ], { stdin: "ignore", stdout: "ignore" })
  ).pipe(Effect.mapError(connectionError))

  // Keep the last part of the master's diagnostics for error reports.
  let diagnostics = ""
  const decoder = new TextDecoder()
  const collector = yield* Stream.runForEach(master.stderr, (chunk) =>
    Effect.sync(() => {
      diagnostics = (diagnostics + decoder.decode(chunk, { stream: true })).slice(-4096)
    })).pipe(Effect.ignore, Effect.forkScoped)

  const check = spawner.exitCode(
    ChildProcess.make(executable, ["-o", `ControlPath=${controlPath}`, ...base, "-O", "check", host], {
      stdin: "ignore",
      stdout: "ignore",
      stderr: "ignore"
    })
  )
  const ready: Effect.Effect<void, SshError> = Effect.gen(function*() {
    while (true) {
      if (!(yield* Effect.orElseSucceed(master.isRunning, () => false))) {
        // The master's stderr ends with the process; collect all of it.
        yield* Fiber.await(collector)
        return yield* connectionError(new Error(diagnostics.trim() || "ssh exited before connecting"))
      }
      if ((yield* Effect.orElseSucceed(check, () => -1)) === 0) return
      yield* Effect.sleep(Duration.millis(25))
    }
  })
  yield* ready.pipe(
    Effect.timeoutOrElse({
      duration: timeout,
      orElse: () =>
        Effect.fail(
          new SshError({ reason: new SshTimeoutError({ description: "the OpenSSH connection did not start in time" }) })
        )
    })
  )
  return ["-o", `ControlPath=${controlPath}`, "-o", "ControlMaster=no"]
})

const connect = Effect.fnUntraced(function*(
  spawner: ChildProcessSpawner["Service"],
  fs: FileSystem.FileSystem,
  defaults: Options,
  destination: Ssh.Destination
): Effect.fn.Return<Ssh.SshConnection, SshError, Scope.Scope> {
  const options: Options = {
    ...defaults,
    port: destination.port ?? defaults.port,
    user: destination.username ?? defaults.user
  }
  const host = destination.host
  const executable = options.executable ?? "ssh"
  const base = baseArguments(options)
  const shared = options.multiplex === false
    ? []
    : yield* startMaster(spawner, fs, executable, base, host, options.connectTimeout ?? Duration.seconds(30))
  const invoke = (
    args: ReadonlyArray<string>,
    options?: { readonly env?: Record<string, string> | undefined; readonly multiplex?: boolean | undefined }
  ) =>
    spawnProcess(
      spawner,
      executable,
      [...(options?.multiplex === false ? [] : shared), ...base, ...args],
      options?.env
    )

  const exec = (command: string, sessionOptions?: SessionOptions) => {
    const args: Array<string> = [sessionOptions?.pty === undefined || sessionOptions.pty === false ? "-T" : "-tt"]
    if (sessionOptions?.forwardAgent === true) args.push("-A")
    const env = Object.entries(sessionOptions?.env ?? {})
    if (env.length > 0) {
      args.push("-o", `SetEnv=${env.map(([name, value]) => `${name}=${quoteConfigValue(value)}`).join(" ")}`)
    }
    args.push(host, "--", command)
    const term = typeof sessionOptions?.pty === "object" ? sessionOptions.pty.term : undefined
    // Multiplexed sessions do not forward environment variables, so sessions
    // with an environment use their own connection.
    return invoke(args, { env: term === undefined ? undefined : { TERM: term }, multiplex: env.length === 0 })
  }

  return Ssh.makeConnection({
    backend: "openssh",
    capabilities: { signals: false, exitSignals: false },
    exec,
    subsystem: (name) => invoke(["-T", "-s", host, name]),
    forwardOut: (target: ForwardTarget) =>
      invoke(["-T", "-W", "socketPath" in target ? target.socketPath : `${target.host}:${target.port}`, host])
  })
})

/**
 * Creates an `Ssh` connection factory backed by the host's `ssh` executable,
 * capturing `ChildProcessSpawner` and `FileSystem` once.
 *
 * **Details**
 *
 * With multiplexing, `connect` establishes the shared connection before it
 * succeeds and closes it with the scope; authentication or host key failures
 * fail with an `SshConnectionError` carrying the `ssh` diagnostics.
 *
 * - `exec` runs `ssh -T` (or `-tt` with `pty`). Environment variables are
 *   sent with `SetEnv`, so the server must accept them through `AcceptEnv`.
 *   Because multiplexed sessions cannot carry environment variables, such
 *   sessions open their own connection. `pty.term` sets `TERM`, while the
 *   terminal size cannot be set.
 * - `subsystem` runs `ssh -s`, and `forwardOut` runs `ssh -W`; the origin of
 *   TCP targets is ignored.
 *
 * **Gotchas**
 *
 * - Signals cannot be delivered (`capabilities.signals` is `false`); the
 *   remote `ChildProcessSpawner` works around this by signalling the remote
 *   process id instead.
 * - Commands killed by a signal report exit status `128 + n`, and `ssh`
 *   itself exits with 255 when the connection fails.
 * - Diagnostics from `ssh` appear on the standard error of remote commands.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*(
  options?: Options
): Effect.fn.Return<Ssh.Ssh["Service"], never, ChildProcessSpawner | FileSystem.FileSystem> {
  const spawner = yield* ChildProcessSpawner
  const fs = yield* FileSystem.FileSystem
  return Ssh.Ssh.of({
    connect: (destination) => connect(spawner, fs, options ?? {}, destination)
  })
})

/**
 * Layer that provides the `Ssh` connection factory through the host's `ssh`
 * executable.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layer = (
  options?: Options
): Layer.Layer<Ssh.Ssh, never, ChildProcessSpawner | FileSystem.FileSystem> => Layer.effect(Ssh.Ssh, make(options))
