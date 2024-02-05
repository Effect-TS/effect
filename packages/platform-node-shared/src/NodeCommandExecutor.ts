/**
 * @since 1.0.0
 */
import type { CommandExecutor } from "@effect/platform/CommandExecutor"
import type { FileSystem } from "@effect/platform/FileSystem"
import type { Layer } from "effect/Layer"
import * as internal from "./internal/commandExecutor.js"

/**
 * @since 1.0.0
 * @category layer
 */
export const layer: Layer<CommandExecutor, never, FileSystem> = internal.layer
