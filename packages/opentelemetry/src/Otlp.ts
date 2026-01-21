/**
 * @since 1.0.0
 */
import type * as Headers from "@effect/platform/Headers"
import type * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import type * as Duration from "effect/Duration"
import * as Layer from "effect/Layer"
import type * as Logger from "effect/Logger"
import type * as Tracer from "effect/Tracer"
import * as OtlpLogger from "./OtlpLogger.js"
import * as OtlpMetrics from "./OtlpMetrics.js"
import * as OtlpSerialization from "./OtlpSerialization.js"
import * as OtlpTracer from "./OtlpTracer.js"

/**
 * Options for OTLP layer configuration.
 *
 * @since 1.0.0
 * @category Models
 */
export interface OtlpLayerOptions {
  readonly baseUrl: string
  readonly resource?: {
    readonly serviceName?: string | undefined
    readonly serviceVersion?: string | undefined
    readonly attributes?: Record<string, unknown>
  }
  readonly headers?: Headers.Input | undefined
  readonly maxBatchSize?: number | undefined
  readonly replaceLogger?: Logger.Logger<any, any> | undefined
  readonly tracerContext?: (<X>(f: () => X, span: Tracer.AnySpan) => X) | undefined
  readonly loggerExportInterval?: Duration.DurationInput | undefined
  readonly loggerExcludeLogSpans?: boolean | undefined
  readonly metricsExportInterval?: Duration.DurationInput | undefined
  readonly tracerExportInterval?: Duration.DurationInput | undefined
  readonly shutdownTimeout?: Duration.DurationInput | undefined
}

const makeLayer = (
  options: OtlpLayerOptions
): Layer.Layer<never, never, HttpClient.HttpClient | OtlpSerialization.OtlpSerialization> => {
  const baseReq = HttpClientRequest.get(options.baseUrl)
  const url = (path: string) => HttpClientRequest.appendUrl(baseReq, path).url
  return Layer.mergeAll(
    OtlpLogger.layer({
      replaceLogger: options.replaceLogger,
      url: url("/v1/logs"),
      resource: options.resource,
      headers: options.headers,
      exportInterval: options.loggerExportInterval,
      maxBatchSize: options.maxBatchSize,
      shutdownTimeout: options.shutdownTimeout,
      excludeLogSpans: options.loggerExcludeLogSpans
    }),
    OtlpMetrics.layer({
      url: url("/v1/metrics"),
      resource: options.resource,
      headers: options.headers,
      exportInterval: options.metricsExportInterval,
      shutdownTimeout: options.shutdownTimeout
    }),
    OtlpTracer.layer({
      url: url("/v1/traces"),
      resource: options.resource,
      headers: options.headers,
      exportInterval: options.tracerExportInterval,
      maxBatchSize: options.maxBatchSize,
      context: options.tracerContext,
      shutdownTimeout: options.shutdownTimeout
    })
  )
}

/**
 * Creates an OTLP layer with JSON serialization.
 *
 * @example
 * ```typescript
 * import { Otlp } from "@effect/opentelemetry"
 *
 * const layer = Otlp.layerJson({ baseUrl: "http://localhost:4318" })
 * ```
 *
 * @since 1.0.0
 * @category Layers
 */
export const layerJson = (options: OtlpLayerOptions): Layer.Layer<never, never, HttpClient.HttpClient> =>
  makeLayer(options).pipe(Layer.provide(OtlpSerialization.layerJson))

/**
 * Creates an OTLP layer with Protobuf serialization.
 *
 * @example
 * ```typescript
 * import { Otlp } from "@effect/opentelemetry"
 *
 * const layer = Otlp.layerProtobuf({ baseUrl: "http://localhost:4318" })
 * ```
 *
 * @since 1.0.0
 * @category Layers
 */
export const layerProtobuf = (options: OtlpLayerOptions): Layer.Layer<never, never, HttpClient.HttpClient> =>
  makeLayer(options).pipe(Layer.provide(OtlpSerialization.layerProtobuf))

/**
 * Creates an OTLP layer with JSON serialization (default).
 *
 * This is an alias for `layerJson` for backwards compatibility.
 *
 * @example
 * ```typescript
 * import { Otlp } from "@effect/opentelemetry"
 *
 * const layer = Otlp.layer({ baseUrl: "http://localhost:4318" })
 * ```
 *
 * @since 1.0.0
 * @category Layers
 */
export const layer = layerJson
