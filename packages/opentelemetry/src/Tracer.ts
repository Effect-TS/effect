/**
 * @since 1.0.0
 */
import type * as Otel from "@opentelemetry/api"
import type { Tag } from "effect/Context"
import type { Effect } from "effect/Effect"
import type { Layer } from "effect/Layer"
import type * as Option from "effect/Option"
import type { ExternalSpan, Tracer as EffectTracer } from "effect/Tracer"
import * as internal from "./internal/tracer.js"
import type { Resource } from "./Resource.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect<Otel.Tracer, never, EffectTracer> = internal.make

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
export const layer: Layer<Resource | Otel.TracerProvider, never, never> = internal.layer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerGlobal: Layer<Resource, never, never> = internal.layerGlobal

/**
 * @since 1.0.0
 * @category layers
 */
export const layerTracer: Layer<Resource | Otel.TracerProvider, never, Otel.Tracer> = internal.layerTracer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerGlobalTracer: Layer<Resource, never, Otel.Tracer> = internal.layerGlobalTracer

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
