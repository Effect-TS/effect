import * as Command from "@effect/platform/Command"
import * as CommandExecutor from "@effect/platform/CommandExecutor"
import type * as PlatformError from "@effect/platform/Error"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type * as Compgen from "../Compgen.js"

// =============================================================================
// Constructors
// =============================================================================

/** @internal */
export const make = (workingDirectory: Option.Option<string>): Effect.Effect<
  CommandExecutor.CommandExecutor,
  never,
  Compgen.Compgen
> =>
  Effect.gen(function*(_) {
    const executor = yield* _(CommandExecutor.CommandExecutor)

    const runShellCommand = (
      command: string
    ): Effect.Effect<never, PlatformError.PlatformError, ReadonlyArray<string>> => {
      const cmd = Option.match(workingDirectory, {
        onNone: () =>
          Command.make(command).pipe(
            Command.runInShell("/bin/bash")
          ),
        onSome: (cwd) =>
          Command.make(command).pipe(
            Command.workingDirectory(cwd),
            Command.runInShell("/bin/bash")
          )
      })
      return executor.lines(cmd)
    }

    const completeDirectoryNames = (
      word: string
    ): Effect.Effect<never, PlatformError.PlatformError, ReadonlyArray<string>> =>
      runShellCommand(`compgen -o nospace -d -S / -- ${word}`)

    const completeFileNames = (
      word: string
    ): Effect.Effect<never, PlatformError.PlatformError, ReadonlyArray<string>> =>
      Effect.gen(function*(_) {
        // For file names, we want the cursor to skip forward to the next
        // argument position, so we append a space (" ") to the end of them
        // below. For directory names, however, we don't want to skip to the
        // next argument position, because we like being able to smash the tab
        // key to keep walking down through a directory tree.
        const files = yield* _(runShellCommand(`compgen -f -- ${word}`))
        const directories = yield* _(completeDirectoryNames(word))
        const directorySet = new Set(directories)
        const filesFiltered = ReadonlyArray.filter(files, (file) => !directorySet.has(`${file}/`))
        return pipe(
          ReadonlyArray.map(filesFiltered, (file) => `${file} `),
          ReadonlyArray.appendAll(directories)
        )
      })

    return Tag.of({
      completeFileNames,
      completeDirectoryNames
    })
  })

// =============================================================================
// Context
// =============================================================================

/** @internal */
export const Tag = Context.Tag<Compgen.Compgen>()

/** @internal */
export const LiveCompgen: Layer.Layer<CommandExecutor.CommandExecutor, never, Compgen.Compgen> =
  Layer.effect(Tag, make(Option.none()))

export const TestCompgen = (
  workingDirectory: string
): Layer.Layer<CommandExecutor.CommandExecutor, never, Compgen.Compgen> =>
  Layer.effect(Tag, make(Option.some(workingDirectory)))
