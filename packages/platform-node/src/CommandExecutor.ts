/**
 * @since 1.0.0
 */
import type { CommandExecutor } from "@effect/platform/CommandExecutor"
import type { FileSystem } from "@effect/platform/FileSystem"
import type { Layer } from "effect/Layer"
import * as internal from "./internal/commandExecutor.js"

export type {
  /**
   * @since 1.0.0
   * @category models
   */
  ExitCode,
  /**
   * @since 1.0.0
   * @category models
   */
  Process,
  /**
   * @since 1.0.0
   * @category models
   */
  ProcessId,
  /**
   * @since 1.0.0
   * @category symbols
   */
  ProcessTypeId,
  /**
   * @since 1.0.0
   * @category models
   */
  Signal
} from "@effect/platform/CommandExecutor"

export {
  /**
   * @since 1.0.0
   * @category tag
   */
  CommandExecutor
} from "@effect/platform/CommandExecutor"

/**
 * @since 1.0.0
 * @category layer
 */
export const layer: Layer<FileSystem, never, CommandExecutor> = internal.layer
