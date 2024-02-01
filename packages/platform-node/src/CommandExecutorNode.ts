/**
 * @since 1.0.0
 */
import * as CommandExecutorNode from "@effect/platform-node-shared/CommandExecutorNode"
import type { CommandExecutor } from "@effect/platform/CommandExecutor"
import type { FileSystem } from "@effect/platform/FileSystem"
import type { Layer } from "effect/Layer"

/**
 * @since 1.0.0
 * @category layer
 */
export const layer: Layer<FileSystem, never, CommandExecutor> = CommandExecutorNode.layer
