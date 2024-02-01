/**
 * @since 1.0.0
 */

import * as PathNode from "@effect/platform-node-shared/PathNode"
import type { Path } from "@effect/platform/Path"
import type { Layer } from "effect/Layer"

/**
 * @since 1.0.0
 * @category layer
 */
export const layer: Layer<never, never, Path> = PathNode.layer

/**
 * @since 1.0.0
 * @category layer
 */
export const layerPosix: Layer<never, never, Path> = PathNode.layerPosix

/**
 * @since 1.0.0
 * @category layer
 */
export const layerWin32: Layer<never, never, Path> = PathNode.layerWin32
