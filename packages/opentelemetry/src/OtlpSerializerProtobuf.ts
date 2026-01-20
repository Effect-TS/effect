/**
 * Protobuf serializer for OTLP telemetry data.
 *
 * This module provides the protobuf-based serializer for OTLP exporters.
 * Import this module only when you need protobuf encoding - it will bring
 * the protobuf encoding code into your bundle.
 *
 * @example
 * ```typescript
 * import { Otlp, OtlpSerializerProtobuf } from "@effect/opentelemetry"
 * import * as Layer from "effect/Layer"
 *
 * // Use protobuf encoding for more efficient wire format
 * const layer = Otlp.layer({ baseUrl: "http://localhost:4318" }).pipe(
 *   Layer.provide(OtlpSerializerProtobuf.protobuf)
 * )
 * ```
 *
 * @since 1.0.0
 */
import * as Layer from "effect/Layer"
import * as OtlpProtobuf from "./internal/otlpProtobuf.js"
import { OtlpSerializer } from "./OtlpSerializer.js"

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
export const protobuf: Layer.Layer<OtlpSerializer> = Layer.succeed(OtlpSerializer, {
  contentType: "application/x-protobuf",
  encodeTraces: (data: any) => OtlpProtobuf.encodeTracesData(data),
  encodeMetrics: (data: any) => OtlpProtobuf.encodeMetricsData(data),
  encodeLogs: (data: any) => OtlpProtobuf.encodeLogsData(data)
})
