/**
 * OtlpSerialization service for tree-shakable protobuf support.
 *
 * This module provides the `OtlpSerialization` service that abstracts the
 * encoding of OTLP telemetry data to HttpBody. By default, the JSON serializer is used.
 * To use protobuf encoding, use `Otlp.layerProtobuf` or provide the `layerProtobuf` layer.
 *
 * @example
 * ```typescript
 * import { Otlp } from "@effect/opentelemetry"
 *
 * // JSON encoding (default)
 * const jsonLayer = Otlp.layerJson({ baseUrl: "http://localhost:4318" })
 *
 * // Protobuf encoding
 * const protobufLayer = Otlp.layerProtobuf({ baseUrl: "http://localhost:4318" })
 * ```
 *
 * @since 1.0.0
 */
import * as HttpBody from "@effect/platform/HttpBody"
import * as Context from "effect/Context"
import * as Layer from "effect/Layer"
import * as OtlpProtobuf from "./internal/otlpProtobuf.js"

/**
 * Service interface for serializing OTLP telemetry data to HttpBody.
 *
 * @since 1.0.0
 * @category Models
 */
export interface OtlpSerialization {
  /**
   * Encodes trace data for transmission.
   */
  readonly traces: (data: unknown) => HttpBody.HttpBody
  /**
   * Encodes metrics data for transmission.
   */
  readonly metrics: (data: unknown) => HttpBody.HttpBody
  /**
   * Encodes logs data for transmission.
   */
  readonly logs: (data: unknown) => HttpBody.HttpBody
}

/**
 * Tag for the OtlpSerialization service.
 *
 * @since 1.0.0
 * @category Tags
 */
export const OtlpSerialization: Context.Tag<OtlpSerialization, OtlpSerialization> = Context.GenericTag<
  OtlpSerialization
>("@effect/opentelemetry/OtlpSerialization")

/**
 * JSON serializer layer for OTLP telemetry data.
 *
 * This is the default serializer used by OTLP exporters. It encodes
 * telemetry data as JSON with `application/json` content type.
 *
 * @since 1.0.0
 * @category Layers
 */
export const layerJson: Layer.Layer<OtlpSerialization> = Layer.succeed(OtlpSerialization, {
  traces: (data) => HttpBody.unsafeJson(data),
  metrics: (data) => HttpBody.unsafeJson(data),
  logs: (data) => HttpBody.unsafeJson(data)
})

/**
 * Protobuf serializer layer for OTLP telemetry data.
 *
 * This serializer encodes telemetry data using Protocol Buffers binary
 * format with `application/x-protobuf` content type. It provides more
 * efficient wire format compared to JSON.
 *
 * @since 1.0.0
 * @category Layers
 */
export const layerProtobuf: Layer.Layer<OtlpSerialization> = Layer.succeed(OtlpSerialization, {
  traces: (data) => HttpBody.uint8Array(OtlpProtobuf.encodeTracesData(data as any), "application/x-protobuf"),
  metrics: (data) => HttpBody.uint8Array(OtlpProtobuf.encodeMetricsData(data as any), "application/x-protobuf"),
  logs: (data) => HttpBody.uint8Array(OtlpProtobuf.encodeLogsData(data as any), "application/x-protobuf")
})
