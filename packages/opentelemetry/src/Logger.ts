/**
 * @since 1.0.0
 */
import * as Otel from "@opentelemetry/sdk-logs"
import type { NonEmptyReadonlyArray } from "effect/Array"
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberId from "effect/FiberId"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import { unknownToAttributeValue } from "./internal/utils.js"
import { Resource } from "./Resource.js"

/**
 * @since 1.0.0
 * @category tags
 */
export class OtelLoggerProvider extends Context.Tag("@effect/opentelemetry/Logger/OtelLoggerProvider")<
  OtelLoggerProvider,
  Otel.LoggerProvider
>() {}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect.Effect<
  Logger.Logger<unknown, void>,
  never,
  OtelLoggerProvider
> = Effect.gen(function*() {
  const loggerProvider = yield* OtelLoggerProvider
  const clock = yield* Effect.clock
  const otelLogger = loggerProvider.getLogger("@effect/opentelemetry")

  return Logger.make((options) => {
    const now = options.date.getTime()

    const attributes: Record<string, any> = {
      fiberId: FiberId.threadName(options.fiberId)
    }
    for (const [key, value] of options.annotations) {
      attributes[key] = unknownToAttributeValue(value)
    }
    for (const span of options.spans) {
      attributes[`logSpan.${span.label}`] = `${now - span.startTime}ms`
    }

    const message = Arr.ensure(options.message).map(unknownToAttributeValue)
    otelLogger.emit({
      body: message.length === 1 ? message[0] : message,
      severityText: options.logLevel.label,
      severityNumber: options.logLevel.ordinal,
      timestamp: options.date,
      observedTimestamp: clock.unsafeCurrentTimeMillis(),
      attributes
    })
  })
})

/**
 * @since 1.0.0
 * @category layers
 */
export const layerLoggerAdd: Layer.Layer<
  never,
  never,
  OtelLoggerProvider
> = Logger.addEffect(make)

/**
 * @since 1.0.0
 * @category layers
 */
export const layerLoggerReplace: Layer.Layer<
  never,
  never,
  OtelLoggerProvider
> = Logger.replaceEffect(Logger.defaultLogger, make)

/**
 * @since 1.0.0
 * @category layers
 */
export const layerLoggerProvider = (
  processor: Otel.LogRecordProcessor | NonEmptyReadonlyArray<Otel.LogRecordProcessor>,
  config?: Omit<Otel.LoggerProviderConfig, "resource">
): Layer.Layer<OtelLoggerProvider, never, Resource> =>
  Layer.scoped(
    OtelLoggerProvider,
    Effect.flatMap(Resource, (resource) =>
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
        (provider) =>
          Effect.ignoreLogged(Effect.promise(
            () => provider.forceFlush().then(() => provider.shutdown())
          ))
      ))
  )
