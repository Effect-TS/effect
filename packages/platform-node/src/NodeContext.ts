/**
 * @since 1.0.0
 */
import * as CommandExecutorNode from "@effect/platform-node-shared/CommandExecutorNode"
import * as FileSystemNode from "@effect/platform-node-shared/FileSystemNode"
import * as PathNode from "@effect/platform-node-shared/PathNode"
import * as TerminalNode from "@effect/platform-node-shared/TerminalNode"
import type * as CommandExecutor from "@effect/platform/CommandExecutor"
import type * as FileSystem from "@effect/platform/FileSystem"
import type * as Path from "@effect/platform/Path"
import type * as Terminal from "@effect/platform/Terminal"
import type * as Worker from "@effect/platform/Worker"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as WorkerNode from "./WorkerNode.js"

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
    PathNode.layer,
    CommandExecutorNode.layer,
    TerminalNode.layer,
    WorkerNode.layerManager
  ),
  Layer.provideMerge(FileSystemNode.layer)
)
