/**
 * @since 1.0.0
 */

import type { Path } from "@effect/platform/Path"
import type { Layer } from "effect/Layer"
import * as internal from "./internal/path.js"

/**
 * @since 1.0.0
 * @category layer
 */
export const layer: Layer<Path> = internal.layer

/**
 * @since 1.0.0
 * @category layer
 */
export const layerPosix: Layer<Path> = internal.layerPosix

/**
 * @since 1.0.0
 * @category layer
 */
export const layerWin32: Layer<Path> = internal.layerWin32
