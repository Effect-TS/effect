/**
 * @since 1.0.0
 */
import type { TracerProvider } from "@opentelemetry/api"
import type * as Resources from "@opentelemetry/resources"
import type { MetricReader } from "@opentelemetry/sdk-metrics"
import type { SpanProcessor, TracerConfig } from "@opentelemetry/sdk-trace-base"
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web"
import * as Effect from "effect/Effect"
import type { LazyArg } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Metrics from "./Metrics.js"
import * as Resource from "./Resource.js"
import * as Tracer from "./Tracer.js"

/**
 * @since 1.0.0
 * @category model
 */
export interface Configuration {
  readonly spanProcessor?: SpanProcessor
  readonly tracerConfig?: Omit<TracerConfig, "resource">
  readonly metricReader?: MetricReader
  readonly resource: {
    readonly serviceName: string
    readonly serviceVersion?: string
    readonly attributes?: Resources.ResourceAttributes
  }
}

/**
 * @since 1.0.0
 * @category layers
 */
export const layerTracerProvider = (
  processor: SpanProcessor,
  config?: Omit<TracerConfig, "resource">
): Layer.Layer<Resource.Resource, never, TracerProvider> =>
  Layer.scoped(
    Tracer.TracerProvider,
    Effect.flatMap(
      Resource.Resource,
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
export const layer: {
  (evaluate: LazyArg<Configuration>): Layer.Layer<never, never, Resource.Resource>
  <R, E>(evaluate: Effect.Effect<R, E, Configuration>): Layer.Layer<R, E, Resource.Resource>
} = (
  evaluate: LazyArg<Configuration> | Effect.Effect<any, any, Configuration>
): Layer.Layer<never, never, Resource.Resource> =>
  Layer.unwrapEffect(
    Effect.map(
      Effect.isEffect(evaluate)
        ? evaluate as Effect.Effect<never, never, Configuration>
        : Effect.sync(evaluate),
      (config) => {
        const ResourceLive = Resource.layer(config.resource)
        const TracerLive = config.spanProcessor ?
          Tracer.layer.pipe(Layer.provide(layerTracerProvider(config.spanProcessor, config.tracerConfig)))
          : Layer.effectDiscard(Effect.unit)
        const MetricsLive = config.metricReader
          ? Metrics.layer(() => config.metricReader!)
          : Layer.effectDiscard(Effect.unit)
        return Layer.merge(TracerLive, MetricsLive).pipe(
          Layer.provideMerge(ResourceLive)
        )
      }
    )
  )
