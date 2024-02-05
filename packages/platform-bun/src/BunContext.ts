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
import * as BunCommandExecutor from "./BunCommandExecutor.js"
import * as BunFileSystem from "./BunFileSystem.js"
import * as BunPath from "./BunPath.js"
import * as BunTerminal from "./BunTerminal.js"
import * as BunWorker from "./BunWorker.js"

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
export const layer: Layer.Layer<BunContext> = pipe(
  Layer.mergeAll(
    BunPath.layer,
    BunCommandExecutor.layer,
    BunTerminal.layer,
    BunWorker.layerManager
  ),
  Layer.provideMerge(BunFileSystem.layer)
)
