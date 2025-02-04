/**
 * @since 1.0.0
 */
import * as Otel from "@opentelemetry/sdk-logs"
import type { NonEmptyReadonlyArray } from "effect/Array"
import type { Tag } from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as internal from "./internal/logger.js"
import { Resource } from "./Resource.js"

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
export const layerLogger: Layer.Layer<never, never, OtelLoggerProvider> = Logger.addEffect(
  internal.make
)

/**
 * @since 1.0.0
 * @category constructors
 */
export const logger: Effect.Effect<Logger.Logger<unknown, void>, never, OtelLoggerProvider> = internal.make

/**
 * @since 1.0.0
 * @category layers
 */
export const layerLoggerProvider = (
  processor: Otel.LogRecordProcessor | NonEmptyReadonlyArray<Otel.LogRecordProcessor>,
  config?: Omit<Otel.LoggerProviderConfig, "resource">
) =>
  Layer.scoped(
    internal.LoggerProvider,
    Effect.flatMap(
      Resource,
      (resource) =>
        Effect.acquireRelease(
          Effect.sync(() => {
            const provider = new Otel.LoggerProvider({
              ...(config ?? undefined),
              resource
            })
            if (Array.isArray(processor)) {
              processor.forEach((p) => provider.addLogRecordProcessor(p))
            } else {
              provider.addLogRecordProcessor(processor as any)
            }
            return provider
          }),
          (provider) => Effect.ignoreLogged(Effect.promise(() => provider.forceFlush().then(() => provider.shutdown())))
        )
    )
  )
