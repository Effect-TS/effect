/**
 * @since 1.0.0
 */
import type * as Headers from "@effect/platform/Headers"
import type * as HttpClient from "@effect/platform/HttpClient"
import * as Arr from "effect/Array"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as FiberId from "effect/FiberId"
import * as FiberRef from "effect/FiberRef"
import * as FiberRefs from "effect/FiberRefs"
import type * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import type * as LogLevel from "effect/LogLevel"
import * as Option from "effect/Option"
import type * as Scope from "effect/Scope"
import * as Tracer from "effect/Tracer"
import * as Exporter from "./internal/otlpExporter.js"
import type { AnyValue, Fixed64, KeyValue, Resource } from "./OtlpResource.js"
import * as OtlpResource from "./OtlpResource.js"

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make: (
  options: {
    readonly url: string
    readonly resource?: {
      readonly serviceName?: string | undefined
      readonly serviceVersion?: string | undefined
      readonly attributes?: Record<string, unknown>
    } | undefined
    readonly headers?: Headers.Input | undefined
    readonly exportInterval?: Duration.DurationInput | undefined
    readonly maxBatchSize?: number | undefined
    readonly shutdownTimeout?: Duration.DurationInput | undefined
    readonly excludeLogSpans?: boolean | undefined
  }
) => Effect.Effect<
  Logger.Logger<unknown, void>,
  never,
  HttpClient.HttpClient | Scope.Scope
> = Effect.fnUntraced(function*(options) {
  const otelResource = yield* OtlpResource.fromConfig(options.resource)
  const scope: IInstrumentationScope = {
    name: OtlpResource.unsafeServiceName(otelResource)
  }

  const exporter = yield* Exporter.make({
    label: "OtlpLogger",
    url: options.url,
    headers: options.headers,
    maxBatchSize: options.maxBatchSize ?? 1000,
    exportInterval: options.exportInterval ?? Duration.seconds(1),
    body: (data): IExportLogsServiceRequest => ({
      resourceLogs: [{
        resource: otelResource,
        scopeLogs: [{
          scope,
          logRecords: data
        }]
      }]
    }),
    shutdownTimeout: options.shutdownTimeout ?? Duration.seconds(3)
  })

  const opts = {
    excludeLogSpans: options.excludeLogSpans ?? false
  }
  return Logger.make((options) => {
    exporter.push(makeLogRecord(options, opts))
  })
})

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = (options: {
  readonly url: string
  readonly resource?: {
    readonly serviceName?: string | undefined
    readonly serviceVersion?: string | undefined
    readonly attributes?: Record<string, unknown>
  } | undefined
  readonly replaceLogger?: Logger.Logger<any, any> | undefined
  readonly headers?: Headers.Input | undefined
  readonly exportInterval?: Duration.DurationInput | undefined
  readonly maxBatchSize?: number | undefined
  readonly shutdownTimeout?: Duration.DurationInput | undefined
  readonly excludeLogSpans?: boolean | undefined
}): Layer.Layer<never, never, HttpClient.HttpClient> =>
  options.replaceLogger ? Logger.replaceScoped(options.replaceLogger, make(options)) : Logger.addScoped(make(options))

// internal

const makeLogRecord = (options: Logger.Logger.Options<unknown>, opts: {
  readonly excludeLogSpans: boolean
}): ILogRecord => {
  const now = options.date.getTime()
  const nanosString = `${now}000000`

  const attributes = OtlpResource.entriesToAttributes(options.annotations)
  attributes.push({
    key: "fiberId",
    value: { stringValue: FiberId.threadName(options.fiberId) }
  })
  if (!opts.excludeLogSpans) {
    for (const span of options.spans) {
      attributes.push({
        key: `logSpan.${span.label}`,
        value: { stringValue: `${now - span.startTime}ms` }
      })
    }
  }
  if (!Cause.isEmpty(options.cause)) {
    attributes.push({
      key: "log.error",
      value: { stringValue: Cause.pretty(options.cause, { renderErrorCause: true }) }
    })
  }

  const message = Arr.ensure(options.message)
  const maybeSpan = Context.getOption(
    FiberRefs.getOrDefault(options.context, FiberRef.currentContext),
    Tracer.ParentSpan
  )

  const logRecord: ILogRecord = {
    severityNumber: logLevelToSeverityNumber(options.logLevel),
    severityText: options.logLevel.label,
    timeUnixNano: nanosString,
    observedTimeUnixNano: nanosString,
    attributes,
    body: OtlpResource.unknownToAttributeValue(message.length === 1 ? message[0] : message),
    droppedAttributesCount: 0
  }

  if (Option.isSome(maybeSpan)) {
    logRecord.traceId = maybeSpan.value.traceId
    logRecord.spanId = maybeSpan.value.spanId
  }

  return logRecord
}

/** Properties of an ExportLogsServiceRequest. */
interface IExportLogsServiceRequest {
  /** ExportLogsServiceRequest resourceLogs */
  resourceLogs?: Array<IResourceLogs>
}

/** Properties of an InstrumentationScope. */
interface IInstrumentationScope {
  /** InstrumentationScope name */
  name: string
  /** InstrumentationScope version */
  version?: string
  /** InstrumentationScope attributes */
  attributes?: Array<KeyValue>
  /** InstrumentationScope droppedAttributesCount */
  droppedAttributesCount?: number
}
/** Properties of a ResourceLogs. */
interface IResourceLogs {
  /** ResourceLogs resource */
  resource?: Resource
  /** ResourceLogs scopeLogs */
  scopeLogs: Array<IScopeLogs>
  /** ResourceLogs schemaUrl */
  schemaUrl?: string
}
/** Properties of an ScopeLogs. */
interface IScopeLogs {
  /** IScopeLogs scope */
  scope?: IInstrumentationScope
  /** IScopeLogs logRecords */
  logRecords?: Array<ILogRecord>
  /** IScopeLogs schemaUrl */
  schemaUrl?: string | null
}
/** Properties of a LogRecord. */
interface ILogRecord {
  /** LogRecord timeUnixNano */
  timeUnixNano: Fixed64
  /** LogRecord observedTimeUnixNano */
  observedTimeUnixNano: Fixed64
  /** LogRecord severityNumber */
  severityNumber?: ESeverityNumber
  /** LogRecord severityText */
  severityText?: string
  /** LogRecord body */
  body?: AnyValue
  /** LogRecord attributes */
  attributes: Array<KeyValue>
  /** LogRecord droppedAttributesCount */
  droppedAttributesCount: number
  /** LogRecord flags */
  flags?: number
  /** LogRecord traceId */
  traceId?: string | Uint8Array
  /** LogRecord spanId */
  spanId?: string | Uint8Array
}

const logLevelToSeverityNumber = (logLevel: LogLevel.LogLevel): ESeverityNumber => {
  switch (logLevel._tag) {
    case "Trace":
      return ESeverityNumber.SEVERITY_NUMBER_TRACE
    case "Debug":
      return ESeverityNumber.SEVERITY_NUMBER_DEBUG
    case "Info":
      return ESeverityNumber.SEVERITY_NUMBER_INFO
    case "Warning":
      return ESeverityNumber.SEVERITY_NUMBER_WARN
    case "Error":
      return ESeverityNumber.SEVERITY_NUMBER_ERROR
    case "Fatal":
      return ESeverityNumber.SEVERITY_NUMBER_FATAL
    default:
      return ESeverityNumber.SEVERITY_NUMBER_UNSPECIFIED
  }
}

/**
 * Numerical value of the severity, normalized to values described in Log Data Model.
 */
const enum ESeverityNumber {
  /** Unspecified. Do NOT use as default */
  SEVERITY_NUMBER_UNSPECIFIED = 0,
  SEVERITY_NUMBER_TRACE = 1,
  SEVERITY_NUMBER_TRACE2 = 2,
  SEVERITY_NUMBER_TRACE3 = 3,
  SEVERITY_NUMBER_TRACE4 = 4,
  SEVERITY_NUMBER_DEBUG = 5,
  SEVERITY_NUMBER_DEBUG2 = 6,
  SEVERITY_NUMBER_DEBUG3 = 7,
  SEVERITY_NUMBER_DEBUG4 = 8,
  SEVERITY_NUMBER_INFO = 9,
  SEVERITY_NUMBER_INFO2 = 10,
  SEVERITY_NUMBER_INFO3 = 11,
  SEVERITY_NUMBER_INFO4 = 12,
  SEVERITY_NUMBER_WARN = 13,
  SEVERITY_NUMBER_WARN2 = 14,
  SEVERITY_NUMBER_WARN3 = 15,
  SEVERITY_NUMBER_WARN4 = 16,
  SEVERITY_NUMBER_ERROR = 17,
  SEVERITY_NUMBER_ERROR2 = 18,
  SEVERITY_NUMBER_ERROR3 = 19,
  SEVERITY_NUMBER_ERROR4 = 20,
  SEVERITY_NUMBER_FATAL = 21,
  SEVERITY_NUMBER_FATAL2 = 22,
  SEVERITY_NUMBER_FATAL3 = 23,
  SEVERITY_NUMBER_FATAL4 = 24
}
