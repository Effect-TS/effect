import * as Command from "@effect/platform/Command"
import * as CommandExecutor from "@effect/platform/CommandExecutor"
import type * as Error from "@effect/platform/Error"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import { constUndefined, identity, pipe } from "effect/Function"
import * as Inspectable from "effect/Inspectable"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as Scope from "effect/Scope"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import * as ChildProcess from "node:child_process"
import { handleErrnoException } from "./error.js"
import { fromWritable } from "./sink.js"
import { fromReadable } from "./stream.js"

const inputToStdioOption = (stdin: Command.Command.Input): "pipe" | "inherit" =>
  typeof stdin === "string" ? stdin : "pipe"

const outputToStdioOption = (output: Command.Command.Output): "pipe" | "inherit" =>
  typeof output === "string" ? output : "pipe"

const toError = (err: unknown): Error => err instanceof globalThis.Error ? err : new globalThis.Error(String(err))

const toPlatformError = (
  method: string,
  error: NodeJS.ErrnoException,
  command: Command.Command
): Error.PlatformError => {
  const flattened = Command.flatten(command).reduce((acc, curr) => {
    const command = `${curr.command} ${curr.args.join(" ")}`
    return acc.length === 0 ? command : `${acc} | ${command}`
  }, "")
  return handleErrnoException("Command", method)(error, [flattened])
}

type ExitCode = readonly [code: number | null, signal: NodeJS.Signals | null]
type ExitCodeDeferred = Deferred.Deferred<ExitCode>

const ProcessProto = {
  [CommandExecutor.ProcessTypeId]: CommandExecutor.ProcessTypeId,
  ...Inspectable.BaseProto,
  toJSON(this: CommandExecutor.Process) {
    return {
      _id: "@effect/platform/CommandExecutor/Process",
      pid: this.pid
    }
  }
}

const runCommand =
  (fileSystem: FileSystem.FileSystem) =>
  (command: Command.Command): Effect.Effect<CommandExecutor.Process, Error.PlatformError, Scope.Scope> => {
    switch (command._tag) {
      case "StandardCommand": {
        const spawn = Effect.flatMap(
          Deferred.make<ExitCode>(),
          (exitCode) =>
            Effect.async<readonly [ChildProcess.ChildProcess, ExitCodeDeferred], Error.PlatformError>(
              (resume) => {
                const handle = ChildProcess.spawn(command.command, command.args, {
                  stdio: [
                    inputToStdioOption(command.stdin),
                    outputToStdioOption(command.stdout),
                    outputToStdioOption(command.stderr)
                  ],
                  cwd: Option.getOrElse(command.cwd, constUndefined),
                  shell: command.shell,
                  env: { ...process.env, ...Object.fromEntries(command.env) },
                  detached: process.platform !== "win32"
                })
                handle.on("error", (err) => {
                  resume(Effect.fail(toPlatformError("spawn", err, command)))
                })
                handle.on("exit", (...args) => {
                  Deferred.unsafeDone(exitCode, Effect.succeed(args))
                })
                handle.on("spawn", () => {
                  resume(Effect.succeed([handle, exitCode]))
                })
                return Effect.sync(() => {
                  handle.kill("SIGTERM")
                })
              }
            )
        )

        const killProcessGroup = process.platform === "win32" ?
          (handle: ChildProcess.ChildProcess, _: NodeJS.Signals) =>
            Effect.async<void, Error.PlatformError>((resume) => {
              ChildProcess.exec(`taskkill /pid ${handle.pid} /T /F`, (error) => {
                if (error) {
                  resume(Effect.fail(toPlatformError("kill", toError(error), command)))
                } else {
                  resume(Effect.void)
                }
              })
            })
          : (handle: ChildProcess.ChildProcess, signal: NodeJS.Signals) =>
            Effect.try({
              try: () => process.kill(-handle.pid!, signal),
              catch: (error) => toPlatformError("kill", toError(error), command)
            })

        const killProcess = (handle: ChildProcess.ChildProcess, signal: NodeJS.Signals) =>
          Effect.suspend(() =>
            handle.kill(signal) ? Effect.void : Effect.fail(
              toPlatformError("kill", new globalThis.Error("Failed to kill process"), command)
            )
          )

        return pipe(
          // Validate that the directory is accessible
          Option.match(command.cwd, {
            onNone: () => Effect.void,
            onSome: (dir) => fileSystem.access(dir)
          }),
          Effect.zipRight(
            Effect.acquireRelease(
              spawn,
              ([handle, exitCode]) =>
                Effect.flatMap(Deferred.isDone(exitCode), (done) => {
                  if (!done) {
                    // Process is still running, kill it
                    return killProcessGroup(handle, "SIGTERM").pipe(
                      Effect.orElse(() => killProcess(handle, "SIGTERM")),
                      Effect.zipRight(Deferred.await(exitCode)),
                      Effect.ignore
                    )
                  }

                  // Process has already exited, check if we need to clean up children
                  return Effect.flatMap(Deferred.await(exitCode), ([code]) => {
                    if (code !== 0 && code !== null) {
                      // Non-zero exit code, attempt to clean up process group
                      return killProcessGroup(handle, "SIGTERM").pipe(Effect.ignore)
                    }

                    return Effect.void
                  })
                })
            )
          ),
          Effect.map(([handle, exitCodeDeferred]): CommandExecutor.Process => {
            let stdin: Sink.Sink<void, unknown, never, Error.PlatformError> = Sink.drain

            if (handle.stdin !== null) {
              stdin = fromWritable(
                () => handle.stdin!,
                (err) => toPlatformError("toWritable", toError(err), command)
              )
            }

            const exitCode: CommandExecutor.Process["exitCode"] = Effect.flatMap(
              Deferred.await(exitCodeDeferred),
              ([code, signal]) => {
                if (code !== null) {
                  return Effect.succeed(CommandExecutor.ExitCode(code))
                }
                // If code is `null`, then `signal` must be defined. See the NodeJS
                // documentation for the `"exit"` event on a `child_process`.
                // https://nodejs.org/api/child_process.html#child_process_event_exit
                return Effect.fail(
                  toPlatformError(
                    "exitCode",
                    new globalThis.Error(`Process interrupted due to receipt of signal: ${signal}`),
                    command
                  )
                )
              }
            )

            const isRunning = Effect.negate(Deferred.isDone(exitCodeDeferred))

            const kill: CommandExecutor.Process["kill"] = (signal = "SIGTERM") =>
              killProcessGroup(handle, signal).pipe(
                Effect.orElse(() => killProcess(handle, signal)),
                Effect.zipRight(Effect.asVoid(Deferred.await(exitCodeDeferred)))
              )

            const pid = CommandExecutor.ProcessId(handle.pid!)
            const stderr = fromReadable<Error.PlatformError, Uint8Array>(
              () => handle.stderr!,
              (err) => toPlatformError("fromReadable(stderr)", toError(err), command)
            )
            let stdout: Stream.Stream<Uint8Array, Error.PlatformError> = fromReadable<
              Error.PlatformError,
              Uint8Array
            >(
              () => handle.stdout!,
              (err) => toPlatformError("fromReadable(stdout)", toError(err), command)
            )
            // TODO: add Sink.isSink
            if (typeof command.stdout !== "string") {
              stdout = Stream.transduce(stdout, command.stdout)
            }
            return Object.assign(Object.create(ProcessProto), {
              pid,
              exitCode,
              isRunning,
              kill,
              stdin,
              stderr,
              stdout
            })
          }),
          typeof command.stdin === "string"
            ? identity
            : Effect.tap((process) =>
              Effect.forkDaemon(Stream.run(command.stdin as Stream.Stream<Uint8Array>, process.stdin))
            )
        )
      }
      case "PipedCommand": {
        const flattened = Command.flatten(command)
        if (flattened.length === 1) {
          return pipe(flattened[0], runCommand(fileSystem))
        }
        const head = flattened[0]
        const tail = flattened.slice(1)
        const initial = tail.slice(0, tail.length - 1)
        const last = tail[tail.length - 1]
        const stream = initial.reduce(
          (stdin, command) =>
            pipe(
              Command.stdin(command, stdin),
              runCommand(fileSystem),
              Effect.map((process) => process.stdout),
              Stream.unwrapScoped
            ),
          pipe(
            runCommand(fileSystem)(head),
            Effect.map((process) => process.stdout),
            Stream.unwrapScoped
          )
        )
        return pipe(Command.stdin(last, stream), runCommand(fileSystem))
      }
    }
  }

/** @internal */
export const layer: Layer.Layer<CommandExecutor.CommandExecutor, never, FileSystem.FileSystem> = Layer.effect(
  CommandExecutor.CommandExecutor,
  pipe(
    FileSystem.FileSystem,
    Effect.map((fileSystem) => CommandExecutor.makeExecutor(runCommand(fileSystem)))
  )
)
