/**
 * @since 1.0.0
 */

import * as internal from "@effect/platform-node/internal/path"
import type { Path } from "@effect/platform/Path"
import type { Layer } from "effect/Layer"

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
