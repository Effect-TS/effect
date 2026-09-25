import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"
import * as ChildProcess from "effect/process/ChildProcess"
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner"
import * as Stream from "effect/Stream"
import { ReleaseError } from "./Errors.ts"

export interface CommandResult {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
}

/**
 * Runs a command with stdin detached (as CI would) and captures both output
 * streams. A non-zero exit is returned, not raised; see {@link runCommandOk}.
 */
export const runCommand = Effect.fn("runCommand")(function*(
  command: string,
  args: ReadonlyArray<string>,
  options: { readonly cwd: string; readonly env?: Record<string, string> | undefined }
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
  const spec = ChildProcess.make(command, args, {
    cwd: options.cwd,
    env: options.env ?? {},
    extendEnv: true,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe"
  })
  return yield* Effect.scoped(
    Effect.gen(function*() {
      const handle = yield* spawner.spawn(spec)
      const [stdout, stderr, exitCode] = yield* Effect.all([
        Stream.mkString(Stream.decodeText(handle.stdout)),
        Stream.mkString(Stream.decodeText(handle.stderr)),
        handle.exitCode
      ], { concurrency: "unbounded" })
      const result: CommandResult = { exitCode: Number(exitCode), stdout, stderr }
      return result
    })
  ).pipe(
    Effect.mapError((cause) => new ReleaseError({ message: `Failed to run ${command} ${args.join(" ")}`, cause }))
  )
})

/** Like {@link runCommand}, but a non-zero exit fails with the captured stderr. */
export const runCommandOk = Effect.fn("runCommandOk")(function*(
  command: string,
  args: ReadonlyArray<string>,
  options: { readonly cwd: string; readonly env?: Record<string, string> | undefined }
) {
  const result = yield* runCommand(command, args, options)
  if (result.exitCode !== 0) {
    return yield* new ReleaseError({
      message: `${command} ${args.join(" ")} exited ${result.exitCode}: ${(result.stderr || result.stdout).trim()}`
    })
  }
  return result.stdout
})

/**
 * The directory that holds `pnpm-workspace.yaml`, searched upwards from the
 * current working directory. `pnpm release` runs from the package directory,
 * so every git and pnpm command must be anchored here instead.
 */
export const findWorkspaceRoot: Effect.Effect<string, ReleaseError, FileSystem.FileSystem | Path.Path> = Effect.gen(
  function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    let current = path.resolve(process.cwd())
    while (true) {
      const exists = yield* fs.exists(path.join(current, "pnpm-workspace.yaml")).pipe(
        Effect.mapError((cause) => new ReleaseError({ message: `Could not inspect ${current}`, cause }))
      )
      if (exists) return current
      const parent = path.dirname(current)
      if (parent === current) {
        return yield* new ReleaseError({ message: "Could not find pnpm-workspace.yaml above the current directory" })
      }
      current = parent
    }
  }
)
