/**
 * @since 1.0.0
 */
import type { Tag } from "@effect/data/Context"
import type { Effect } from "@effect/io/Effect"
import type { Layer } from "@effect/io/Layer"
import type { ExternalSpan, Tracer } from "@effect/io/Tracer"
import * as internal from "@effect/opentelemetry/internal/tracer"
import { OtelSupervisor } from "@effect/opentelemetry/internal/tracer"
import type { Resource } from "@effect/opentelemetry/Resource"
import type * as Otel from "@opentelemetry/api"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect<Resource, never, Tracer> = internal.make

export {
  /**
   * An effect supervisor that sets up the OpenTelemetry context for the fiber executions.
   *
   * @since 1.0.0
   * @category supervisor
   */
  OtelSupervisor
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeExternalSpan: (
  options: {
    readonly traceId: string
    readonly spanId: string
    readonly traceFlags?: number
    readonly traceState?: string
  }
) => ExternalSpan = internal.makeExternalSpan

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer<Resource, never, never> = internal.layer

/**
 * @since 1.0.0
 * @category tags
 */
export const TraceFlags: Tag<Otel.TraceFlags, Otel.TraceFlags> = internal.traceFlagsTag

/**
 * @since 1.0.0
 * @category tags
 */
export const TraceState: Tag<Otel.TraceState, Otel.TraceState> = internal.traceStateTag
