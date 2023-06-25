/**
 * @since 1.0.0
 */
import type { Effect } from "@effect/io/Effect"
import type { Layer } from "@effect/io/Layer"
import type { Tracer } from "@effect/io/Tracer"
import * as internal from "@effect/opentelemetry/internal_effect_untraced/tracer"
import type { Resource } from "@effect/opentelemetry/Resource"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect<Resource, never, Tracer> = internal.make

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer<Resource, never, never> = internal.layer
