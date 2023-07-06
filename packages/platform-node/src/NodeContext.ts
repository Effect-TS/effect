/**
 * @since 1.0.0
 */
import { pipe } from "@effect/data/Function"
import * as Layer from "@effect/io/Layer"
import * as CommandExecutor from "@effect/platform-node/CommandExecutor"
import * as Console from "@effect/platform-node/Console"
import * as FileSystem from "@effect/platform-node/FileSystem"
import * as Path from "@effect/platform-node/Path"

/**
 * @since 1.0.0
 * @category models
 */
export type NodeContext = Console.Console | CommandExecutor.CommandExecutor | FileSystem.FileSystem | Path.Path

/**
 * @since 1.0.0
 * @category layer
 */
export const layer: Layer.Layer<never, never, NodeContext> = pipe(
  Console.layer,
  Layer.merge(FileSystem.layer),
  Layer.merge(Path.layer),
  Layer.merge(Layer.provideMerge(FileSystem.layer, CommandExecutor.layer))
)
