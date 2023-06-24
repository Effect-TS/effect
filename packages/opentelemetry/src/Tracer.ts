/**
 * @since 1.0.0
 */
import type { Effect } from "@effect/io/Effect"
import type { Layer } from "@effect/io/Layer"
import type { Tracer } from "@effect/io/Tracer"
import * as internal from "@effect/opentelemetry/internal_effect_untraced/tracer"

/**
 * @since 1.0.0
 * @category models
 */
export interface TracerOptions {
  readonly name: string
  readonly version?: string
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (options: TracerOptions) => Effect<never, never, Tracer> = internal.make

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: (options: TracerOptions) => Layer<never, never, never> = internal.layer
