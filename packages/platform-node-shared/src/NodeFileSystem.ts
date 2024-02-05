/**
 * @since 1.0.0
 */

import type { FileSystem } from "@effect/platform/FileSystem"
import type { Layer } from "effect/Layer"
import * as internal from "./internal/fileSystem.js"

/**
 * @since 1.0.0
 * @category layer
 */
export const layer: Layer<FileSystem> = internal.layer
