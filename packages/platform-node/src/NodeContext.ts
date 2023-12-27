/**
 * @since 1.0.0
 */
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as CommandExecutor from "./CommandExecutor.js"
import * as FileSystem from "./FileSystem.js"
import * as Path from "./Path.js"
import * as Terminal from "./Terminal.js"
import * as Worker from "./Worker.js"

/**
 * @since 1.0.0
 * @category models
 */
export type NodeContext =
  | CommandExecutor.CommandExecutor
  | FileSystem.FileSystem
  | Path.Path
  | Terminal.Terminal
  | Worker.WorkerManager

/**
 * @since 1.0.0
 * @category layer
 */
export const layer: Layer.Layer<never, never, NodeContext> = pipe(
  Layer.mergeAll(
    Path.layer,
    CommandExecutor.layer,
    Terminal.layer,
    Worker.layerManager
  ),
  Layer.provideMerge(FileSystem.layer)
)
