/**
 * @since 1.0.0
 */
import type { MetricProducer, MetricReader } from "@opentelemetry/sdk-metrics"
import type { NonEmptyReadonlyArray } from "effect/Array"
import type { DurationInput } from "effect/Duration"
import type * as Effect from "effect/Effect"
import type { LazyArg } from "effect/Function"
import type { Layer } from "effect/Layer"
import type * as Scope from "effect/Scope"
import * as internal from "./internal/metrics.js"
import type { Resource } from "./Resource.js"

/**
 * @since 1.0.0
 * @category producer
 */
export const makeProducer: Effect.Effect<MetricProducer, never, Resource> = internal.makeProducer

/**
 * @since 1.0.0
 * @category producer
 */
export const registerProducer: (
  self: MetricProducer,
  metricReader: LazyArg<MetricReader | NonEmptyReadonlyArray<MetricReader>>
) => Effect.Effect<Array<any>, never, Scope.Scope> = internal.registerProducer

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: (
  evaluate: LazyArg<MetricReader | NonEmptyReadonlyArray<MetricReader>>,
  options?: {
    readonly shutdownTimeout?:
      | DurationInput
      | undefined
  }
) => Layer<never, never, Resource> = internal.layer
