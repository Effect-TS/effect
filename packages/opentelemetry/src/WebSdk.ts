/**
 * @since 1.0.0
 */
import type * as Resources from "@opentelemetry/resources"
import type { MetricReader } from "@opentelemetry/sdk-metrics"
import type { SpanProcessor, TracerConfig } from "@opentelemetry/sdk-trace-base"
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web"
import type { NonEmptyReadonlyArray } from "effect/Array"
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
  readonly spanProcessor?: SpanProcessor | ReadonlyArray<SpanProcessor> | undefined
  readonly tracerConfig?: Omit<TracerConfig, "resource">
  readonly metricReader?: MetricReader | ReadonlyArray<MetricReader> | undefined
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
  processor: SpanProcessor | NonEmptyReadonlyArray<SpanProcessor>,
  config?: Omit<TracerConfig, "resource">
): Layer.Layer<Tracer.OtelTracerProvider, never, Resource.Resource> =>
  Layer.scoped(
    Tracer.OtelTracerProvider,
    Effect.flatMap(
      Resource.Resource,
      (resource) =>
        Effect.acquireRelease(
          Effect.sync(() => {
            const provider = new WebTracerProvider({
              ...(config ?? undefined),
              resource
            })
            if (Array.isArray(processor)) {
              processor.forEach((p) => provider.addSpanProcessor(p))
            } else {
              provider.addSpanProcessor(processor as any)
            }
            return provider
          }),
          (provider) => Effect.ignoreLogged(Effect.promise(() => provider.forceFlush().then(() => provider.shutdown())))
        )
    )
  )

/**
 * @since 1.0.0
 * @category layer
 */
export const layer: {
  (evaluate: LazyArg<Configuration>): Layer.Layer<Resource.Resource>
  <E, R>(evaluate: Effect.Effect<Configuration, E, R>): Layer.Layer<Resource.Resource, E, R>
} = (
  evaluate: LazyArg<Configuration> | Effect.Effect<Configuration, any, any>
): Layer.Layer<Resource.Resource> =>
  Layer.unwrapEffect(
    Effect.map(
      Effect.isEffect(evaluate)
        ? evaluate as Effect.Effect<Configuration>
        : Effect.sync(evaluate),
      (config) => {
        const ResourceLive = Resource.layer(config.resource)
        const TracerLive =
          config.spanProcessor && !(Array.isArray(config.spanProcessor) && config.spanProcessor.length === 0) ?
            Tracer.layer.pipe(Layer.provide(layerTracerProvider(config.spanProcessor as any, config.tracerConfig)))
            : Layer.effectDiscard(Effect.void)
        const MetricsLive =
          config.metricReader && !(Array.isArray(config.metricReader) && config.metricReader.length === 0)
            ? Metrics.layer(() => config.metricReader as any)
            : Layer.effectDiscard(Effect.void)
        return Layer.merge(TracerLive, MetricsLive).pipe(
          Layer.provideMerge(ResourceLive)
        )
      }
    )
  )
