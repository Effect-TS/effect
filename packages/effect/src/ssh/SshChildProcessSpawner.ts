/**
 * A `ChildProcessSpawner` that runs commands on a remote host over SSH.
 *
 * Commands built with `ChildProcess.make` run through the remote user's
 * login shell, so code written against `ChildProcessSpawner` can target a
 * remote machine by providing a spawner made from an `SshConnection`. Each command in a pipeline runs in
 * its own `exec` channel, with data piped between them locally, so pipe
 * options (`from: "stderr"`, `from: "all"`) behave as they do locally.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as Deferred from "../Deferred.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as PlatformError from "../PlatformError.ts"
import * as ChildProcess from "../process/ChildProcess.ts"
import {
  type ChildProcessHandle,
  type ChildProcessSpawner,
  ExitCode,
  make as makeSpawner,
  makeHandle,
  ProcessId
} from "../process/ChildProcessSpawner.ts"
import * as Pull from "../Pull.ts"
import type * as Scope from "../Scope.ts"
import * as Sink from "../Sink.ts"
import * as Stream from "../Stream.ts"
import { concat, equals, fromUtf8, utf8 } from "./internal/wire.ts"
import type * as Ssh from "./Ssh.ts"
import type * as SshClient from "./SshClient.ts"
import type { SshError } from "./SshError.ts"

/**
 * Quotes a string for POSIX shells.
 *
 * @stability experimental
 * @category utility
 * @since 4.0.0
 */
export const quote = (value: string): string =>
  value.length > 0 && /^[A-Za-z0-9_@%+=:,./-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`

/**
 * Builds the command line sent to the server for a standard command.
 *
 * **Details**
 *
 * Arguments are quoted unless `shell` is set, in which case the command and
 * arguments are joined and interpreted by the remote shell (or by the shell
 * named by `shell`). `cwd` becomes a `cd` prefix and `env` is applied with
 * `env`; without `extendEnv: true`, `env -i` replaces the remote
 * environment, matching local semantics.
 *
 * @stability experimental
 * @category utility
 * @since 4.0.0
 */
export const commandLine = (command: ChildProcess.StandardCommand): string => {
  const { options } = command
  const parts: Array<string> = []
  if (options.cwd !== undefined) parts.push(`cd ${quote(options.cwd)} &&`)
  let program: string
  if (options.shell !== undefined && options.shell !== false) {
    const script = [command.command, ...command.args].join(" ")
    program = typeof options.shell === "string" ? `${quote(options.shell)} -c ${quote(script)}` : script
  } else {
    program = [command.command, ...command.args].map(quote).join(" ")
  }
  const env = Object.entries(options.env ?? {}).filter((entry): entry is [string, string] => entry[1] !== undefined)
  if (options.env !== undefined && options.extendEnv !== true) {
    parts.push("exec env -i", ...env.map(([name, value]) => quote(`${name}=${value}`)), program)
  } else if (env.length > 0) {
    parts.push("exec env", ...env.map(([name, value]) => quote(`${name}=${value}`)), program)
  } else if (options.shell !== undefined && options.shell !== false && typeof options.shell !== "string") {
    parts.push(program)
  } else {
    parts.push("exec", program)
  }
  return parts.join(" ")
}

const describe = (command: ChildProcess.Command): string => {
  switch (command._tag) {
    case "StandardCommand":
      return [command.command, ...command.args].join(" ")
    case "PipedCommand":
      return `${describe(command.left)} | ${describe(command.right)}`
  }
}

const toPlatformError = (method: string, command: ChildProcess.Command) => (error: SshError) =>
  PlatformError.systemError({
    _tag: error.reason._tag === "SshChannelOpenError" ? "BadResource" : "Unknown",
    module: "ChildProcess",
    method,
    description: error.message,
    pathOrDescriptor: describe(command),
    cause: error
  })

const flatten = (command: ChildProcess.Command): {
  readonly commands: ReadonlyArray<ChildProcess.StandardCommand>
  readonly pipes: ReadonlyArray<ChildProcess.PipeOptions>
} => {
  const commands: Array<ChildProcess.StandardCommand> = []
  const pipes: Array<ChildProcess.PipeOptions> = []
  const visit = (current: ChildProcess.Command) => {
    if (current._tag === "StandardCommand") {
      commands.push(current)
    } else {
      visit(current.left)
      pipes.push(current.options)
      visit(current.right)
    }
  }
  visit(command)
  return { commands, pipes }
}

const resolveStdin = (options: ChildProcess.CommandOptions): ChildProcess.StdinConfig => {
  const stdin = options.stdin
  if (stdin === undefined) return { stream: "pipe", endOnDone: true }
  if (typeof stdin === "string" || Stream.isStream(stdin)) return { stream: stdin, endOnDone: true }
  return { stream: stdin.stream, endOnDone: stdin.endOnDone ?? true }
}

const resolveOutput = (
  option: ChildProcess.CommandOutput | ChildProcess.StdoutConfig | undefined
): ChildProcess.CommandOutput => {
  if (option === undefined) return "pipe"
  if (typeof option === "string" || Sink.isSink(option)) return option
  return option.stream ?? "pipe"
}

const PID_MARKER = "\x1eEFFECT_SSH_PID "

const signalNumbers: Record<string, number> = {
  HUP: 1,
  INT: 2,
  QUIT: 3,
  ABRT: 6,
  KILL: 9,
  USR1: 10,
  USR2: 12,
  PIPE: 13,
  ALRM: 14,
  TERM: 15
}

const signalName = (signal: string) => signal.startsWith("SIG") ? signal.slice(3) : signal

/**
 * Builds a command line that reports the remote process id on standard error
 * and then runs the command in place of `sh`. The `sh` script contains no
 * quotes or backslashes and every argument is quoted once, so the line is
 * interpreted the same way by POSIX shells and by fish.
 */
const pidReportingCommandLine = (command: ChildProcess.StandardCommand): string => {
  const { options } = command
  const useShell = options.shell !== undefined && options.shell !== false
  const program = useShell
    ? [typeof options.shell === "string" ? options.shell : "sh", "-c", [command.command, ...command.args].join(" ")]
    : [command.command, ...command.args]
  const env = Object.entries(options.env ?? {}).filter((entry): entry is [string, string] => entry[1] !== undefined)
  const argv = options.env !== undefined && options.extendEnv !== true
    ? ["env", "-i", ...env.map(([name, value]) => `${name}=${value}`), ...program]
    : env.length > 0
    ? ["env", ...env.map(([name, value]) => `${name}=${value}`), ...program]
    : program
  const cwd = options.cwd
  const script = `echo "${PID_MARKER}$$" >&2; ${cwd === undefined ? "" : `cd "$1" || exit 127; shift; `}exec "$@"`
  return `exec sh -c ${quote(script)} sh ${[...(cwd === undefined ? [] : [cwd]), ...argv].map(quote).join(" ")}`
}

/**
 * Splits the process id report from the head of standard error.
 */
const readPidReport = Effect.fnUntraced(function*(stderr: Stream.Stream<Uint8Array, SshError>) {
  const pull = yield* Stream.toPull(stderr)
  const marker = utf8(PID_MARKER)
  let head: Uint8Array = new Uint8Array(0)
  let ended = false
  while (true) {
    const chunks = yield* pull.pipe(
      Pull.catchDone(() => {
        ended = true
        return Effect.succeed([] as ReadonlyArray<Uint8Array>)
      })
    )
    head = concat([head, ...chunks])
    const prefix = head.subarray(0, marker.length)
    if (ended || !equals(prefix, marker.subarray(0, prefix.length))) break
    const newline = head.indexOf(10)
    if (newline === -1) continue
    const pid = Number(fromUtf8(head.subarray(marker.length, newline)))
    const rest = head.subarray(newline + 1)
    return {
      pid: Number.isInteger(pid) && pid > 0 ? pid : undefined,
      stderr: Stream.concat(rest.length > 0 ? Stream.make(rest) : Stream.empty, Stream.fromPull(Effect.succeed(pull)))
    }
  }
  return {
    pid: undefined,
    stderr: Stream.concat(
      head.length > 0 ? Stream.make(head) : Stream.empty,
      ended ? Stream.empty : Stream.fromPull(Effect.succeed(pull))
    )
  }
})

/**
 * Creates a `ChildProcessSpawner` that runs commands over an
 * `SshConnection`.
 *
 * **Details**
 *
 * - `kill` sends the kill signal (default `SIGTERM`), then `SIGKILL` if the
 *   command has not exited after `forceKillAfter` (default one second), and
 *   finally closes the session.
 * - With backends that cannot deliver signals (such as `OpenSsh`), each
 *   command runs through `sh -c` so that it reports its remote process id,
 *   and `kill` signals the remote process group with a separate `kill`
 *   command. `pid` is then the remote process id; otherwise it is a local
 *   counter. In this mode `shell: true` commands are interpreted by `sh`
 *   rather than the remote login shell.
 * - A command killed by a signal fails `exitCode`, like local processes.
 * - Output configured as `"ignore"` or `"inherit"` is drained and discarded;
 *   `"inherit"` cannot reach the local terminal.
 * - `unref` has no effect.
 *
 * **Gotchas**
 *
 * - `additionalFds` are not supported and fail with a `BadArgument` error.
 * - `cwd` is not validated before the command starts; a missing directory
 *   makes the command exit with a non-zero status.
 * - The remote login shell interprets the command line, so it must accept
 *   POSIX quoting.
 * - Without `Capabilities.exitSignals`, a command that exits with status
 *   `128 + n` (or 255) after this spawner sent it signal `n` is reported as
 *   killed by that signal.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = (connection: Ssh.SshConnection): ChildProcessSpawner["Service"] => {
  let nextPid = 1
  const reportsPid = !connection.capabilities.signals

  const spawnStandard = Effect.fnUntraced(function*(
    command: ChildProcess.StandardCommand
  ): Effect.fn.Return<ChildProcessHandle, PlatformError.PlatformError, Scope.Scope> {
    if (command.options.additionalFds !== undefined && Object.keys(command.options.additionalFds).length > 0) {
      return yield* PlatformError.badArgument({
        module: "ChildProcess",
        method: "spawn",
        description: "additional file descriptors are not supported over SSH"
      })
    }
    const session = yield* connection.exec(reportsPid ? pidReportingCommandLine(command) : commandLine(command)).pipe(
      Effect.mapError(toPlatformError("spawn", command))
    )
    const exited = Deferred.makeUnsafe<SshClient.SessionExit, SshError>()
    yield* Effect.forkScoped(Deferred.into(session.exit, exited))
    const isRunning = Effect.map(Deferred.isDone(exited), (done) => !done)

    const lift = (method: string) => <A, R>(effect: Effect.Effect<A, SshError, R>) =>
      Effect.mapError(effect, toPlatformError(method, command))

    let remotePid: number | undefined
    let sessionStderr = session.stderr
    if (reportsPid) {
      const report = yield* lift("spawn")(readPidReport(session.stderr))
      remotePid = report.pid
      sessionStderr = report.stderr
    }

    // Standard input
    const stdinConfig = resolveStdin(command.options)
    const stdinSink: Sink.Sink<void, Uint8Array, never, PlatformError.PlatformError> = Sink.forEach(
      (chunk: Uint8Array) => lift("stdin")(session.write(chunk))
    ).pipe(
      Sink.mapEffect(() => stdinConfig.endOnDone === false ? Effect.void : lift("stdin")(session.eof))
    )
    if (Stream.isStream(stdinConfig.stream)) {
      yield* Effect.forkScoped(Stream.run(stdinConfig.stream, stdinSink))
    } else if (stdinConfig.stream !== "pipe") {
      yield* Effect.ignore(session.eof)
    }

    // Output
    const output = (
      stream: Stream.Stream<Uint8Array, SshError>,
      option: ChildProcess.CommandOutput,
      method: string
    ) =>
      Effect.gen(function*() {
        const lifted = Stream.mapError(stream, toPlatformError(method, command))
        if (option === "ignore" || option === "inherit") {
          yield* Effect.forkScoped(Effect.ignore(Stream.runDrain(lifted)))
          return Stream.empty
        }
        if (Sink.isSink(option)) return Stream.transduce(lifted, option)
        return lifted
      })
    const stdout = yield* output(session.stdout, resolveOutput(command.options.stdout), "stdout")
    const stderr = yield* output(sessionStderr, resolveOutput(command.options.stderr), "stderr")

    // Signals
    let lastSignal: string | undefined
    const sendSignal = (signal: string): Effect.Effect<void> => {
      lastSignal = signalName(signal)
      if (!reportsPid) return Effect.ignore(session.signal(signal))
      if (remotePid === undefined) return Effect.void
      const name = signalName(signal)
      return Effect.ignore(connection.run(`kill -${name} -- -${remotePid} 2>/dev/null || kill -${name} ${remotePid}`))
    }

    const signalled = (exit: SshClient.SessionExit): string | undefined => {
      if (exit._tag === "ExitSignal") return exit.signal
      if (connection.capabilities.exitSignals || lastSignal === undefined) return undefined
      // Without exit signals, a signal death shows up as status 128 + n, or as
      // 255 when OpenSSH relays it through a multiplexed connection.
      const number = signalNumbers[lastSignal]
      return exit.code === 255 || (number !== undefined && exit.code === 128 + number)
        ? `SIG${lastSignal}`
        : undefined
    }

    const exitCode = Effect.flatMap(
      lift("exitCode")(Deferred.await(exited)),
      (exit) => {
        const signal = signalled(exit)
        return signal === undefined && exit._tag === "ExitStatus"
          ? Effect.succeed(ExitCode(exit.code))
          : Effect.fail(PlatformError.systemError({
            _tag: "Unknown",
            module: "ChildProcess",
            method: "exitCode",
            description: `Process interrupted due to receipt of signal: '${signal}'`,
            pathOrDescriptor: describe(command)
          }))
      }
    )

    const awaitExit = (duration: Duration.Input) =>
      Effect.map(Effect.timeoutOption(Deferred.await(exited), duration), () => Deferred.isDoneUnsafe(exited))
    const kill = (options?: ChildProcess.KillOptions | undefined) =>
      Effect.gen(function*() {
        if (Deferred.isDoneUnsafe(exited)) return
        yield* sendSignal(options?.killSignal ?? command.options.killSignal ?? "SIGTERM")
        const grace = options?.forceKillAfter ?? command.options.forceKillAfter ?? Duration.seconds(1)
        if (yield* awaitExit(grace).pipe(Effect.orElseSucceed(() => false))) return
        // OpenSSH keeps a session without a pty open until its process exits,
        // so escalate to SIGKILL before giving up on the session.
        yield* sendSignal("SIGKILL")
        if (yield* awaitExit(Duration.seconds(1)).pipe(Effect.orElseSucceed(() => false))) return
        yield* Effect.timeoutOption(session.close, Duration.seconds(1))
      })

    yield* Effect.addFinalizer(() => kill(command.options))

    return makeHandle({
      pid: ProcessId(remotePid ?? nextPid++),
      exitCode,
      isRunning,
      kill,
      stdin: stdinSink,
      stdout,
      stderr,
      all: Stream.merge(stdout, stderr),
      getInputFd: () => Sink.drain,
      getOutputFd: () => Stream.empty,
      unref: Effect.succeed(Effect.void)
    })
  })

  const spawn = Effect.fnUntraced(function*(
    command: ChildProcess.Command
  ): Effect.fn.Return<ChildProcessHandle, PlatformError.PlatformError, Scope.Scope> {
    if (command._tag === "StandardCommand") return yield* spawnStandard(command)
    const { commands, pipes } = flatten(command)
    const handles: Array<ChildProcessHandle> = [yield* spawnStandard(commands[0])]
    for (let i = 1; i < commands.length; i++) {
      const previous = handles[handles.length - 1]
      const from = pipes[i - 1]?.from ?? "stdout"
      const to = pipes[i - 1]?.to ?? "stdin"
      if (to !== "stdin") {
        return yield* PlatformError.badArgument({
          module: "ChildProcess",
          method: "spawn",
          description: `piping to ${to} is not supported over SSH`
        })
      }
      const source = from === "stderr" ? previous.stderr : from === "all" ? previous.all : previous.stdout
      const next = commands[i]
      const stdin = resolveStdin(next.options)
      handles.push(
        yield* spawnStandard(ChildProcess.make(next.command, next.args, {
          ...next.options,
          stdin: { ...stdin, stream: source }
        }))
      )
    }
    const last = handles[handles.length - 1]
    return makeHandle({
      pid: last.pid,
      exitCode: last.exitCode,
      isRunning: last.isRunning,
      kill: (options) =>
        Effect.forEach([...handles].reverse(), (handle) => Effect.ignore(handle.kill(options)), { discard: true }),
      stdin: handles[0].stdin,
      stdout: last.stdout,
      stderr: last.stderr,
      all: last.all,
      getInputFd: last.getInputFd,
      getOutputFd: last.getOutputFd,
      unref: Effect.succeed(Effect.void)
    })
  })

  return makeSpawner(spawn)
}
