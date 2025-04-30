/**
 * @since 1.0.0
 */
import type * as Headers from "@effect/platform/Headers"
import type * as HttpClient from "@effect/platform/HttpClient"
import type * as Duration from "effect/Duration"
import * as Layer from "effect/Layer"
import type * as Logger from "effect/Logger"
import type * as Tracer from "effect/Tracer"
import * as OtlpLogger from "./OtlpLogger.js"
import * as OtlpMetrics from "./OtlpMetrics.js"
import * as OtlpTracer from "./OtlpTracer.js"

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = (options: {
  readonly baseUrl: string
  readonly resource: {
    readonly serviceName: string
    readonly serviceVersion?: string | undefined
    readonly attributes?: Record<string, unknown>
  }
  readonly headers?: Headers.Input | undefined
  readonly maxBatchSize?: number | undefined
  readonly replaceLogger?: Logger.Logger<any, any> | undefined
  readonly tracerContext?: (<X>(f: () => X, span: Tracer.AnySpan) => X) | undefined
  readonly loggerExportInterval?: Duration.DurationInput | undefined
  readonly metricsExportInterval?: Duration.DurationInput | undefined
  readonly tracerExportInterval?: Duration.DurationInput | undefined
  readonly shutdownTimeout?: Duration.DurationInput | undefined
}): Layer.Layer<never, never, HttpClient.HttpClient> =>
  Layer.mergeAll(
    OtlpLogger.layer({
      replaceLogger: options.replaceLogger,
      url: `${options.baseUrl}/v1/logs`,
      resource: options.resource,
      headers: options.headers,
      exportInterval: options.loggerExportInterval,
      maxBatchSize: options.maxBatchSize,
      shutdownTimeout: options.shutdownTimeout
    }),
    OtlpMetrics.layer({
      url: `${options.baseUrl}/v1/metrics`,
      resource: options.resource,
      headers: options.headers,
      exportInterval: options.metricsExportInterval,
      shutdownTimeout: options.shutdownTimeout
    }),
    OtlpTracer.layer({
      url: `${options.baseUrl}/v1/traces`,
      resource: options.resource,
      headers: options.headers,
      exportInterval: options.tracerExportInterval,
      maxBatchSize: options.maxBatchSize,
      context: options.tracerContext,
      shutdownTimeout: options.shutdownTimeout
    })
  )
