/**
 * @since 1.0.0
 */
import type * as Otel from "@opentelemetry/sdk-logs"
import type { NonEmptyReadonlyArray } from "effect/Array"
import type { Tag } from "effect/Context"
import * as Logger from "effect/Logger"
import * as internal from "./internal/logger.js"

/**
 * @since 1.0.0
 * @category tags
 */
export interface OtelLoggerProvider {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category tags
 */
export const OtelLoggerProvider: Tag<OtelLoggerProvider, Otel.LoggerProvider> = internal.LoggerProvider

/**
 * @since 1.0.0
 * @category layers
 */
export const layerLogger = Logger.addEffect(internal.make)

/**
 * @since 1.0.0
 * @category constructors
 */
export const logger = internal.make

/**
 * @since 1.0.0
 * @category layers
 */
export const layerLoggerProvider = (
  processor: Otel.LogRecordProcessor | NonEmptyReadonlyArray<Otel.LogRecordProcessor>,
  config?: Omit<Otel.LoggerProviderConfig, "resource">
) => internal.layerLoggerProvider(processor, config)
