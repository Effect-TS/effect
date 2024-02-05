/**
 * @since 1.0.0
 */
import type * as FileSystem from "@effect/platform/FileSystem"
import type * as Etag from "@effect/platform/Http/Etag"
import type * as Platform from "@effect/platform/Http/Platform"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as internal from "../internal/http/platform.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect.Effect<Platform.Platform, never, FileSystem.FileSystem | Etag.Generator> = internal.make

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<Platform.Platform> = internal.layer
