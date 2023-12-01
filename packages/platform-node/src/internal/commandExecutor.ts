import * as Command from "@effect/platform/Command"
import * as CommandExecutor from "@effect/platform/CommandExecutor"
import type * as Error from "@effect/platform/Error"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import { constUndefined, pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as Scope from "effect/Scope"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import * as ChildProcess from "node:child_process"
import { handleErrnoException } from "./error.js"
import { fromWritable } from "./sink.js"
import { fromReadable } from "./stream.js"

const inputToStdioOption = (stdin: Option.Option<Command.Command.Input>): "pipe" | "inherit" =>
  Option.match(stdin, { onNone: () => "inherit", onSome: () => "pipe" })

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
type ExitCodeDeferred = Deferred.Deferred<never, ExitCode>

const runCommand =
  (fileSystem: FileSystem.FileSystem) =>
  (command: Command.Command): Effect.Effect<Scope.Scope, Error.PlatformError, CommandExecutor.Process> => {
    switch (command._tag) {
      case "StandardCommand": {
        const spawn = Effect.flatMap(
          Deferred.make<never, ExitCode>(),
          (exitCode) =>
            Effect.async<never, Error.PlatformError, readonly [ChildProcess.ChildProcess, ExitCodeDeferred]>(
              (resume) => {
                const handle = ChildProcess.spawn(command.command, command.args, {
                  stdio: [
                    inputToStdioOption(command.stdin),
                    outputToStdioOption(command.stdout),
                    outputToStdioOption(command.stderr)
                  ],
                  cwd: Option.getOrElse(command.cwd, constUndefined),
                  shell: command.shell,
                  env: { ...process.env, ...Object.fromEntries(command.env) }
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
        return pipe(
          // Validate that the directory is accessible
          Option.match(command.cwd, {
            onNone: () => Effect.unit,
            onSome: (dir) => fileSystem.access(dir)
          }),
          Effect.zipRight(
            Effect.acquireRelease(
              spawn,
              ([handle, exitCode]) =>
                Effect.flatMap(Deferred.isDone(exitCode), (done) =>
                  done ? Effect.unit : Effect.suspend(() => {
                    if (handle.kill("SIGTERM")) {
                      return Deferred.await(exitCode)
                    }
                    return Effect.unit
                  }))
            )
          ),
          Effect.map(([handle, exitCodeDeferred]): CommandExecutor.Process => {
            let stdin: Sink.Sink<never, Error.PlatformError, unknown, never, void> = Sink.drain

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
              Effect.suspend(() =>
                handle.kill(signal)
                  ? Effect.asUnit(Deferred.await(exitCodeDeferred))
                  : Effect.fail(toPlatformError("kill", new globalThis.Error("Failed to kill process"), command))
              )

            const pid = CommandExecutor.ProcessId(handle.pid!)
            const stderr = fromReadable<Error.PlatformError, Uint8Array>(
              () => handle.stderr!,
              (err) => toPlatformError("fromReadable(stderr)", toError(err), command)
            )
            let stdout: Stream.Stream<never, Error.PlatformError, Uint8Array> = fromReadable<
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
            return {
              [CommandExecutor.ProcessTypeId]: CommandExecutor.ProcessTypeId,
              pid,
              exitCode,
              isRunning,
              kill,
              stdin,
              stderr,
              stdout
            }
          }),
          Effect.tap((process) =>
            Option.match(command.stdin, {
              onNone: () => Effect.unit,
              onSome: (stdin) => Effect.forkDaemon(Stream.run(stdin, process.stdin))
            })
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
export const layer: Layer.Layer<FileSystem.FileSystem, never, CommandExecutor.CommandExecutor> = Layer.effect(
  CommandExecutor.CommandExecutor,
  pipe(
    FileSystem.FileSystem,
    Effect.map((fileSystem) => CommandExecutor.makeExecutor(runCommand(fileSystem)))
  )
)
