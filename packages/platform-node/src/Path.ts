/**
 * @since 1.0.0
 */

import type { Path } from "@effect/platform/Path"
import type { Layer } from "effect/Layer"
import * as internal from "./internal/path.js"

export {
  /**
   * @since 1.0.0
   * @category tag
   */
  Path
} from "@effect/platform/Path"

/**
 * @since 1.0.0
 * @category layer
 */
export const layer: Layer<never, never, Path> = internal.layer

/**
 * @since 1.0.0
 * @category layer
 */
export const layerPosix: Layer<never, never, Path> = internal.layerPosix

/**
 * @since 1.0.0
 * @category layer
 */
export const layerWin32: Layer<never, never, Path> = internal.layerWin32
