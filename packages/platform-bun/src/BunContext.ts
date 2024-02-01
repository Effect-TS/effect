/**
 * @since 1.0.0
 */
import type * as CommandExecutor from "@effect/platform/CommandExecutor"
import type * as FileSystem from "@effect/platform/FileSystem"
import type * as Path from "@effect/platform/Path"
import type * as Terminal from "@effect/platform/Terminal"
import type * as Worker from "@effect/platform/Worker"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as CommandExecutorBun from "./CommandExecutorBun.js"
import * as FileSystemBun from "./FileSystemBun.js"
import * as PathBun from "./PathBun.js"
import * as TerminalBun from "./TerminalBun.js"
import * as WorkerBun from "./WorkerBun.js"

/**
 * @since 1.0.0
 * @category models
 */
export type BunContext =
  | CommandExecutor.CommandExecutor
  | FileSystem.FileSystem
  | Path.Path
  | Terminal.Terminal
  | Worker.WorkerManager

/**
 * @since 1.0.0
 * @category layer
 */
export const layer: Layer.Layer<never, never, BunContext> = pipe(
  Layer.mergeAll(
    PathBun.layer,
    CommandExecutorBun.layer,
    TerminalBun.layer,
    WorkerBun.layerManager
  ),
  Layer.provideMerge(FileSystemBun.layer)
)
