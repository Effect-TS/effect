/**
 * @since 1.0.0
 */
import type { MetricProducer, MetricReader } from "@opentelemetry/sdk-metrics"
import type * as Effect from "effect/Effect"
import type { LazyArg } from "effect/Function"
import type { Layer } from "effect/Layer"
import * as internal from "./internal/metrics.js"

/**
 * @since 1.0.0
 * @category producer
 */
export const makeProducer: Effect.Effect<"Otel.Resource", never, MetricProducer> = internal.makeProducer

/**
 * @since 1.0.0
 * @category producer
 */
export const registerProducer: (
  self: MetricProducer,
  metricReader: LazyArg<MetricReader>
) => Effect.Effect<"Scope", never, MetricReader> = internal.registerProducer

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: (evaluate: LazyArg<MetricReader>) => Layer<"Otel.Resource", never, never> = internal.layer
