/**
 * @since 1.0.0
 */
import * as NodeCommandExecutor from "@effect/platform-node-shared/NodeCommandExecutor"
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import * as NodePath from "@effect/platform-node-shared/NodePath"
import * as NodeTerminal from "@effect/platform-node-shared/NodeTerminal"
import type * as CommandExecutor from "@effect/platform/CommandExecutor"
import type * as FileSystem from "@effect/platform/FileSystem"
import type * as Path from "@effect/platform/Path"
import type * as Terminal from "@effect/platform/Terminal"
import type * as Worker from "@effect/platform/Worker"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as NodeWorker from "./NodeWorker.js"

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
export const layer: Layer.Layer<NodeContext> = pipe(
  Layer.mergeAll(
    NodePath.layer,
    NodeCommandExecutor.layer,
    NodeTerminal.layer,
    NodeWorker.layerManager
  ),
  Layer.provideMerge(NodeFileSystem.layer)
)
