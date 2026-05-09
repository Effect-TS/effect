/**
 * OtlpSerialization service for tree-shakable protobuf support.
 *
 * This module provides the `OtlpSerialization` service that abstracts the
 * encoding of OTLP telemetry data to HttpBody.
 *
 * @since 1.0.0
 */
import * as HttpBody from "@effect/platform/HttpBody"
import * as Context from "effect/Context"
import * as Layer from "effect/Layer"
import * as OtlpProtobuf from "./internal/otlpProtobuf.js"

/**
 * @since 1.0.0
 * @category Tags
 */
export class OtlpSerialization extends Context.Tag("@effect/opentelemetry/OtlpSerialization")<
  OtlpSerialization,
  {
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
>() {}

/**
 * JSON serializer layer for OTLP telemetry data.
 *
 * It encodes telemetry data as JSON with `application/json` content type.
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
