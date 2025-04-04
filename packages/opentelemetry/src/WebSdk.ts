/**
 * @since 1.0.0
 */
import type * as OtelApi from "@opentelemetry/api"
import type { LoggerProviderConfig, LogRecordProcessor } from "@opentelemetry/sdk-logs"
import type { MetricReader } from "@opentelemetry/sdk-metrics"
import type { SpanProcessor, TracerConfig } from "@opentelemetry/sdk-trace-base"
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web"
import type { NonEmptyReadonlyArray } from "effect/Array"
import * as Effect from "effect/Effect"
import { constant, type LazyArg } from "effect/Function"
import * as Layer from "effect/Layer"
import { isNonEmpty } from "./internal/utils.js"
import * as Logger from "./Logger.js"
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
  readonly logRecordProcessor?: LogRecordProcessor | ReadonlyArray<LogRecordProcessor> | undefined
  readonly loggerProviderConfig?: Omit<LoggerProviderConfig, "resource"> | undefined
  readonly resource: {
    readonly serviceName: string
    readonly serviceVersion?: string
    readonly attributes?: OtelApi.Attributes
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
              resource,
              spanProcessors: Array.isArray(processor) ? (processor as any) : [processor]
            })
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

        const TracerLive = isNonEmpty(config.spanProcessor)
          ? Layer.provide(Tracer.layer, layerTracerProvider(config.spanProcessor, config.tracerConfig))
          : Layer.empty

        const LoggerLive = isNonEmpty(config.logRecordProcessor)
          ? Layer.provide(
            Logger.layerLoggerAdd,
            Logger.layerLoggerProvider(config.logRecordProcessor, config.loggerProviderConfig)
          )
          : Layer.empty

        const MetricsLive = isNonEmpty(config.metricReader)
          ? Metrics.layer(constant(config.metricReader))
          : Layer.empty

        return Layer.mergeAll(TracerLive, MetricsLive, LoggerLive).pipe(
          Layer.provideMerge(ResourceLive)
        )
      }
    )
  )
