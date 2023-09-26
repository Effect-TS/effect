/**
 * @since 1.0.0
 */
import type { Tag } from "@effect/data/Context"
import type * as Option from "@effect/data/Option"
import type { Effect } from "@effect/io/Effect"
import type { Layer } from "@effect/io/Layer"
import type { ExternalSpan, Tracer } from "@effect/io/Tracer"
import * as internal from "@effect/opentelemetry/internal/tracer"
import type { Resource } from "@effect/opentelemetry/Resource"
import type * as Otel from "@opentelemetry/api"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect<Otel.Tracer, never, Tracer> = internal.make

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeExternalSpan: (
  options: {
    readonly traceId: string
    readonly spanId: string
    readonly traceFlags?: number | undefined
    readonly traceState?: string | Otel.TraceState | undefined
  }
) => ExternalSpan = internal.makeExternalSpan

/**
 * @since 1.0.0
 * @category accessors
 */
export const currentOtelSpan: Effect<never, never, Option.Option<Otel.Span>> = internal.currentOtelSpan

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer<Resource, never, never> = internal.layer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerOtelTracer: Layer<Resource, never, Otel.Tracer> = internal.layerOtelTracer

/**
 * @since 1.0.0
 * @category tags
 */
export const OtelTracer: Tag<Otel.Tracer, Otel.Tracer> = internal.OtelTracer

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
