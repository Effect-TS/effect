/**
 * @since 1.0.0
 */
import type * as Otel from "@opentelemetry/api"
import type { NoSuchElementException } from "effect/Cause"
import type { Tag } from "effect/Context"
import type { Effect } from "effect/Effect"
import type { Layer } from "effect/Layer"
import type { ExternalSpan, ParentSpan, Tracer as EffectTracer } from "effect/Tracer"
import * as internal from "./internal/tracer.js"
import type { Resource } from "./Resource.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect<EffectTracer, never, OtelTracer> = internal.make

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
 * Get the current OpenTelemetry span.
 *
 * Works with both the official OpenTelemetry API (via `Tracer.layer`, `NodeSdk.layer`, etc.)
 * and the lightweight OTLP module (`OtlpTracer.layer`).
 *
 * When using OTLP, the returned span is a wrapper that conforms to the
 * OpenTelemetry `Span` interface.
 *
 * @since 1.0.0
 * @category accessors
 */
export const currentOtelSpan: Effect<Otel.Span, NoSuchElementException> = internal.currentOtelSpan

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWithoutOtelTracer: Layer<never, never, OtelTracer> = internal.layerWithoutOtelTracer

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer<OtelTracer, never, Resource | OtelTracerProvider> = internal.layer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerGlobal: Layer<OtelTracer, never, Resource> = internal.layerGlobal

/**
 * @since 1.0.0
 * @category layers
 */
export const layerTracer: Layer<OtelTracer, never, Resource | OtelTracerProvider> = internal.layerTracer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerGlobalTracer: Layer<OtelTracer, never, Resource> = internal.layerGlobalTracer

/**
 * @since 1.0.0
 * @category tags
 */
export interface OtelTracerProvider {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category tags
 */
export const OtelTracerProvider: Tag<OtelTracerProvider, Otel.TracerProvider> = internal.TracerProvider

/**
 * @since 1.0.0
 * @category tags
 */
export interface OtelTracer {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category tags
 */
export const OtelTracer: Tag<OtelTracer, Otel.Tracer> = internal.Tracer

/**
 * @since 1.0.0
 * @category tags
 */
export interface OtelTraceFlags {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category tags
 */
export const OtelTraceFlags: Tag<OtelTraceFlags, Otel.TraceFlags> = internal.traceFlagsTag

/**
 * @since 1.0.0
 * @category tags
 */
export interface OtelTraceState {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category tags
 */
export const OtelTraceState: Tag<OtelTraceState, Otel.TraceState> = internal.traceStateTag

/**
 * Set the effect's parent span from the given opentelemetry `SpanContext`.
 *
 * This is handy when you set up OpenTelemetry outside of Effect and want to
 * attach to a parent span.
 *
 * @since 1.0.0
 * @category propagation
 */
export const withSpanContext: {
  (
    spanContext: Otel.SpanContext
  ): <A, E, R>(
    effect: Effect<A, E, R>
  ) => Effect<A, E, Exclude<R, ParentSpan>>
  <A, E, R>(
    effect: Effect<A, E, R>,
    spanContext: Otel.SpanContext
  ): Effect<A, E, Exclude<R, ParentSpan>>
} = internal.withSpanContext
