/**
 * @since 1.0.0
 */

import type { FileSystem } from "@effect/platform/FileSystem"
import type { Layer } from "effect/Layer"
import * as internal from "./internal/fileSystem.js"

export type {
  /**
   * @since 1.0.0
   * @category model
   */
  File,
  /**
   * @since 1.0.0
   * @category model
   */
  MakeDirectoryOptions,
  /**
   * @since 1.0.0
   * @category model
   */
  MakeTempDirectoryOptions,
  /**
   * @since 1.0.0
   * @category model
   */
  MakeTempFileOptions,
  /**
   * @since 1.0.0
   * @category model
   */
  OpenFileOptions,
  /**
   * @since 1.0.0
   * @category model
   */
  ReadDirectoryOptions,
  /**
   * @since 1.0.0
   * @category model
   */
  RemoveOptions,
  /**
   * @since 1.0.0
   * @category model
   */
  SeekMode,
  /**
   * @since 1.0.0
   * @category model
   */
  SinkOptions,
  /**
   * @since 1.0.0
   * @category model
   */
  StreamOptions,
  /**
   * @since 1.0.0
   * @category model
   */
  WriteFileOptions
} from "@effect/platform/FileSystem"

export {
  /**
   * @since 1.0.0
   * @category tag
   */
  FileSystem,
  /**
   * @since 1.0.0
   * @category constructor
   */
  Size
} from "@effect/platform/FileSystem"

/**
 * @since 1.0.0
 * @category layer
 */
export const layer: Layer<never, never, FileSystem> = internal.layer
