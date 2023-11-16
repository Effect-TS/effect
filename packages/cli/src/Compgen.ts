/**
 * @since 1.0.0
 */
import type { CommandExecutor } from "@effect/platform/CommandExecutor"
import type { PlatformError } from "@effect/platform/Error"
import type { Tag } from "effect/Context"
import type { Effect } from "effect/Effect"
import type { Layer } from "effect/Layer"
import * as InternalCompgen from "./internal/compgen.js"

/**
 * `Compgen` simplifies the process of calling Bash's built-in `compgen` command.
 *
 * @since 1.0.0
 * @category models
 */
export interface Compgen {
  completeFileNames(word: string): Effect<never, PlatformError, ReadonlyArray<string>>
  completeDirectoryNames(word: string): Effect<never, PlatformError, ReadonlyArray<string>>
}

/**
 * @since 1.0.0
 * @category context
 */
export const Compgen: Tag<Compgen, Compgen> = InternalCompgen.Tag

/**
 * @since 1.0.0
 * @category context
 */
export const layer: Layer<CommandExecutor, never, Compgen> = InternalCompgen.layer

/**
 * @since 1.0.0
 * @category context
 */
export const testLayer: (workingDirectory: string) => Layer<CommandExecutor, never, Compgen> =
  InternalCompgen.testLayer
