/**
 * @since 1.0.0
 */
import { pipe } from "@effect/data/Function"
import * as Layer from "@effect/io/Layer"
import * as CommandExecutor from "@effect/platform-bun/CommandExecutor"
import * as FileSystem from "@effect/platform-bun/FileSystem"
import * as Path from "@effect/platform-bun/Path"

/**
 * @since 1.0.0
 * @category models
 */
export type BunContext = CommandExecutor.CommandExecutor | FileSystem.FileSystem | Path.Path

/**
 * @since 1.0.0
 * @category layer
 */
export const layer: Layer.Layer<never, never, BunContext> = pipe(
  FileSystem.layer,
  Layer.merge(Path.layer),
  Layer.merge(Layer.provideMerge(FileSystem.layer, CommandExecutor.layer))
)
