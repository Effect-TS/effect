/**
 * @since 1.0.0
 */
import type * as Otel from "@opentelemetry/api"
import type { NoSuchElementException } from "effect/Cause"
import type { Tag } from "effect/Context"
import type { Effect } from "effect/Effect"
import type { Layer } from "effect/Layer"
import type { ExternalSpan, Tracer as EffectTracer } from "effect/Tracer"
import * as internal from "./internal/tracer.js"
import type { Resource } from "./Resource.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect<EffectTracer, never, Otel.Tracer> = internal.make

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
export const currentOtelSpan: Effect<Otel.Span, NoSuchElementException> = internal.currentOtelSpan

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer<never, never, Resource | Otel.TracerProvider> = internal.layer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerGlobal: Layer<never, never, Resource> = internal.layerGlobal

/**
 * @since 1.0.0
 * @category layers
 */
export const layerTracer: Layer<Otel.Tracer, never, Resource | Otel.TracerProvider> = internal.layerTracer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerGlobalTracer: Layer<Otel.Tracer, never, Resource> = internal.layerGlobalTracer

/**
 * @since 1.0.0
 * @category tags
 */
export const TracerProvider: Tag<Otel.TracerProvider, Otel.TracerProvider> = internal.TracerProvider

/**
 * @since 1.0.0
 * @category tags
 */
export const Tracer: Tag<Otel.Tracer, Otel.Tracer> = internal.Tracer

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

/**
 * Attach the provided Effect to the current Span as reported from OpenTelemetry's
 * context propagation.
 *
 * This is handy when you set up OpenTelemetry outside of Effect and want to
 * attach to a parent span.
 *
 * @since 1.0.0
 * @category propagation
 */
export const withActiveSpan: <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R> = internal.withActiveSpan
