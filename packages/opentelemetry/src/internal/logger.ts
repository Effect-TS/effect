import type * as Otel from "@opentelemetry/sdk-logs"
import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Logger from "effect/Logger"
import * as Record from "effect/Record"
import * as FiberRefs from "../../../effect/src/FiberRefs.js"
import * as defaultServices from "../../../effect/src/internal/defaultServices.js"
import type { OtelLoggerProvider } from "../Logger.js"
import { recordToAttributes, unknownToAttributeValue } from "./utils.js"

/** @internal */
export const LoggerProvider = Context.GenericTag<
  OtelLoggerProvider,
  Otel.LoggerProvider
>(
  "@effect/opentelemetry/Logger/OtelLoggerProvider"
)

/** @internal */
export const make = Effect.gen(function*() {
  const loggerProvider = yield* LoggerProvider

  const otelLogger = loggerProvider.getLogger("@effect/opentelemetry")

  return Logger.make((options) => {
    const services = FiberRefs.getOrDefault(options.context, defaultServices.currentServices)
    const clock = Context.get(services, Clock.Clock)
    const structured = Logger.structuredLogger.log(options)

    const attributes = {
      fiberId: structured.fiberId,
      ...recordToAttributes(structured.annotations),
      ...formatLogSpans(structured.spans)
    }

    otelLogger.emit({
      body: unknownToAttributeValue(structured.message),
      severityText: structured.logLevel,
      severityNumber: options.logLevel.ordinal,
      timestamp: options.date,
      observedTimestamp: clock.unsafeCurrentTimeMillis(),
      attributes
    })
  })
})

/** @internal */
const formatLogSpans = Record.mapEntries(
  (value, key) => [`logSpan.${key}`, `${value}ms`] as const
)
