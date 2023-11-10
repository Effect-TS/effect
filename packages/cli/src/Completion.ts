/**
 * @since 1.0.0
 */
import type { FileSystem } from "@effect/platform/FileSystem"
import type { Path } from "@effect/platform/Path"
import type { Effect } from "effect/Effect"
import type { NonEmptyReadonlyArray } from "effect/ReadonlyArray"
import type { CliConfig } from "./CliConfig.js"
import type { Command } from "./Command.js"
import type { Compgen } from "./Compgen.js"
import * as InternalCompletion from "./internal/completion.js"
import type { ShellType } from "./ShellType.js"

/**
 * @since 1.0.0
 * @category completions
 */
export const getCompletions: <A>(
  words: ReadonlyArray<string>,
  index: number,
  command: Command<A>,
  config: CliConfig,
  compgen: Compgen
) => Effect<FileSystem, never, ReadonlyArray<string>> = InternalCompletion.getCompletions

/**
 * @since 1.0.0
 * @category completions
 */
export const getCompletionScript: (
  pathToExecutable: string,
  programNames: NonEmptyReadonlyArray<string>,
  shellType: ShellType,
  path: Path
) => string = InternalCompletion.getCompletionScript
