/**
 * @since 1.0.0
 */
import type * as Etag from "@effect/platform/Http/Etag"
import type * as Layer from "effect/Layer"
import * as internal from "../internal/http/etag.js"

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<never, never, Etag.Generator> = internal.layer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWeak: Layer.Layer<never, never, Etag.Generator> = internal.layerWeak
