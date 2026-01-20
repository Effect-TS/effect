/**
 * OtlpSerializer service for tree-shakable protobuf support.
 *
 * This module provides the `OtlpSerializer` service that abstracts the
 * encoding of OTLP telemetry data. By default, the JSON serializer is used.
 * To use protobuf encoding, provide the `OtlpSerializerProtobuf.protobuf` layer.
 *
 * @example
 * ```typescript
 * import { Otlp } from "@effect/opentelemetry"
 *
 * // JSON encoding (default) - protobuf code is tree-shaken away
 * const jsonLayer = Otlp.layer({ baseUrl: "http://localhost:4318" })
 *
 * // Protobuf encoding - explicitly import to include in bundle
 * import { OtlpSerializerProtobuf } from "@effect/opentelemetry"
 *
 * const protobufLayer = Otlp.layer({ baseUrl: "http://localhost:4318" }).pipe(
 *   Layer.provide(OtlpSerializerProtobuf.protobuf)
 * )
 * ```
 *
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Layer from "effect/Layer"

/**
 * Service interface for serializing OTLP telemetry data.
 *
 * @since 1.0.0
 * @category Models
 */
export interface OtlpSerializer {
  /**
   * The content type header to use for HTTP requests.
   */
  readonly contentType: string
  /**
   * Encodes trace data for transmission.
   */
  readonly encodeTraces: (data: unknown) => Uint8Array | string
  /**
   * Encodes metrics data for transmission.
   */
  readonly encodeMetrics: (data: unknown) => Uint8Array | string
  /**
   * Encodes logs data for transmission.
   */
  readonly encodeLogs: (data: unknown) => Uint8Array | string
}

/**
 * Tag for the OtlpSerializer service.
 *
 * @since 1.0.0
 * @category Tags
 */
export const OtlpSerializer: Context.Tag<OtlpSerializer, OtlpSerializer> = Context.GenericTag<OtlpSerializer>(
  "@effect/opentelemetry/OtlpSerializer"
)

/**
 * JSON serializer layer for OTLP telemetry data.
 *
 * This is the default serializer used by OTLP exporters. It encodes
 * telemetry data as JSON strings with `application/json` content type.
 *
 * @since 1.0.0
 * @category Layers
 */
export const json: Layer.Layer<OtlpSerializer> = Layer.succeed(OtlpSerializer, {
  contentType: "application/json",
  encodeTraces: (data) => JSON.stringify(data),
  encodeMetrics: (data) => JSON.stringify(data),
  encodeLogs: (data) => JSON.stringify(data)
})
