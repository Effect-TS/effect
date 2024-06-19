/**
 * @since 1.0.0
 */
import type * as Etag from "@effect/platform/Etag"
import type * as Layer from "effect/Layer"
import * as internal from "./internal/etag.js"

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<Etag.Generator> = internal.layer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWeak: Layer.Layer<Etag.Generator> = internal.layerWeak
