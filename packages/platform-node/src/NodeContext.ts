/**
 * @since 1.0.0
 */
import * as CommandExecutor from "@effect/platform-node/CommandExecutor"
import * as FileSystem from "@effect/platform-node/FileSystem"
import * as Path from "@effect/platform-node/Path"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"

/**
 * @since 1.0.0
 * @category models
 */
export type NodeContext = CommandExecutor.CommandExecutor | FileSystem.FileSystem | Path.Path

/**
 * @since 1.0.0
 * @category layer
 */
export const layer: Layer.Layer<never, never, NodeContext> = pipe(
  FileSystem.layer,
  Layer.merge(Path.layer),
  Layer.merge(Layer.provideMerge(FileSystem.layer, CommandExecutor.layer))
)
