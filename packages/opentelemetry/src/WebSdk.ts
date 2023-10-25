/**
 * @since 1.0.0
 */
import type { TracerProvider } from "@opentelemetry/api"
import type { MetricReader } from "@opentelemetry/sdk-metrics"
import type { SpanProcessor, TracerConfig } from "@opentelemetry/sdk-trace-base"
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web"
import * as Effect from "effect/Effect"
import type { LazyArg } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Metrics from "./Metrics"
import { Resource } from "./Resource"
import * as Tracer from "./Tracer"

/**
 * @since 1.0.0
 * @category model
 */
export interface Configuration {
  readonly spanProcessor?: SpanProcessor
  readonly tracerConfig?: Omit<TracerConfig, "resource">
  readonly metricReader?: MetricReader
}

/**
 * @since 1.0.0
 * @category layers
 */
export const layerTracerProvider = (
  processor: SpanProcessor,
  config?: Omit<TracerConfig, "resource">
): Layer.Layer<Resource, never, TracerProvider> =>
  Layer.scoped(
    Tracer.TracerProvider,
    Effect.flatMap(
      Resource,
      (resource) =>
        Effect.acquireRelease(
          Effect.sync(() => {
            const provider = new WebTracerProvider({
              ...(config ?? {}),
              resource
            })
            provider.addSpanProcessor(processor)
            return provider
          }),
          (provider) => Effect.promise(() => provider.shutdown())
        )
    )
  )

/**
 * @since 1.0.0
 * @category layer
 */
export const layer = (
  evaluate: LazyArg<Configuration>
): Layer.Layer<Resource, never, never> =>
  Layer.unwrapEffect(
    Effect.sync(() => {
      const config = evaluate()
      const TracerLive = config.spanProcessor ?
        Tracer.layer.pipe(Layer.use(layerTracerProvider(config.spanProcessor, config.tracerConfig)))
        : Layer.effectDiscard(Effect.unit)
      const MetricsLive = config.metricReader
        ? Metrics.layer(() => config.metricReader!)
        : Layer.effectDiscard(Effect.unit)
      return Layer.merge(TracerLive, MetricsLive)
    })
  )
