import * as Otel from "@opentelemetry/sdk-logs"
import type { NonEmptyReadonlyArray } from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Inspectable from "effect/Inspectable"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as Match from "effect/Match"
import * as Predicate from "effect/Predicate"
import * as Record from "effect/Record"
import type { OtelLoggerProvider } from "../Logger.js"
import { Resource } from "../Resource.js"

/** @internal */
export const LoggerProvider = Context.GenericTag<
  OtelLoggerProvider,
  Otel.LoggerProvider
>(
  "@effect/opentelemetry/Logger/OtelLoggerProvider"
)

/** @internal */
export const layerLoggerProvider = (
  processor: Otel.LogRecordProcessor | NonEmptyReadonlyArray<Otel.LogRecordProcessor>,
  config?: Omit<Otel.LoggerProviderConfig, "resource">
) =>
  Layer.scoped(
    LoggerProvider,
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

/** @internal */
export const make = Effect.gen(function*() {
  const loggerProvider = yield* LoggerProvider
  const resource = yield* Resource

  const otelLogger = loggerProvider.getLogger(
    resource.attributes["service.name"] as string
  )

  return Logger.make((options) => {
    const structured = Logger.structuredLogger.log(options)

    const attributes = {
      fiberId: structured.fiberId,
      ...formatLogSpans(structured.spans),
      ...formatAnnotations(structured.annotations)
    }

    otelLogger.emit({
      body: formatMessage(structured.message),
      severityText: structured.logLevel,
      severityNumber: options.logLevel.ordinal,
      timestamp: options.date,
      observedTimestamp: new Date(),
      attributes
    })
  })
})

/** @internal */
const formatLogSpans = Record.mapEntries(
  (value, key) => [`logSpan.${key}`, `${value}ms`] as const
)

/** @internal */
const formatAnnotations = Record.map(
  (value) => Predicate.isString(value) ? value : Inspectable.format(value)
)

/** @internal */
const formatMessage = Match.type<unknown>().pipe(
  Match.whenOr(
    Predicate.isString,
    Predicate.isNumber,
    Predicate.isBoolean,
    Predicate.isUndefined,
    Predicate.isNull,
    (value) => value
  ),
  Match.orElse((_) => Inspectable.format(_))
)
