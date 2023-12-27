/**
 * @since 1.0.0
 *
 * Also includes exports from [`@effect/platform/Http/Etag`](https://effect-ts.github.io/platform/platform/Http/Etag.ts.html).
 */
import type * as Etag from "@effect/platform/Http/Etag"
import type * as Layer from "effect/Layer"
import * as internal from "../internal/http/etag.js"

/**
 * @since 1.0.0
 */
export * from "@effect/platform/Http/Etag"

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
