/**
 * @since 1.0.0
 */
import * as Headers from "@effect/platform/Headers"
import * as HttpBody from "@effect/platform/HttpBody"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as Cause from "effect/Cause"
import type * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import * as Inspectable from "effect/Inspectable"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schedule from "effect/Schedule"
import * as Scope from "effect/Scope"
import * as Tracer from "effect/Tracer"
import type { ExtractTag } from "effect/Types"
import { Resource } from "./Resource.js"

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make: (
  options: {
    readonly url: string
    readonly name?: string | undefined
    readonly headers?: Headers.Input | undefined
    readonly exportInterval?: Duration.DurationInput | undefined
    readonly maxBatchSize?: number | undefined
  }
) => Effect.Effect<
  Tracer.Tracer,
  never,
  HttpClient.HttpClient | Scope.Scope | Resource
> = Effect.fnUntraced(function*(options) {
  const exporterScope = yield* Effect.scope
  const exportInterval = options.exportInterval ? Duration.decode(options.exportInterval) : Duration.seconds(5)
  const maxBatchSize = options.maxBatchSize ?? 1000

  const client = HttpClient.filterStatusOk(yield* HttpClient.HttpClient).pipe(
    HttpClient.tapError((error) => {
      if (error._tag !== "ResponseError" || error.response.status !== 429) {
        return Effect.void
      }
      const retryAfter = error.response.headers["retry-after"]
      const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : 5
      return Effect.sleep(Duration.seconds(retryAfterSeconds))
    }),
    HttpClient.retryTransient({
      schedule: Schedule.spaced(1000)
    })
  )

  let headers = Headers.unsafeFromRecord({
    "user-agent": "effect-opentelemetry/0.0.0"
  })
  if (options.headers) {
    headers = Headers.merge(Headers.fromInput(options.headers), headers)
  }

  const resource = yield* Resource
  const otelResource: OtlpResource = {
    attributes: entriesToAttributes(Object.entries(resource.attributes)),
    droppedAttributesCount: 0
  }
  const scope: Scope = {
    name: options.name ?? resource.attributes["service.name"] as string ?? "unknown"
  }

  let spanBuffer: Array<OtlpSpan> = []

  const exportLatch = Effect.unsafeMakeLatch(false)

  const runExport = Effect.suspend(() => {
    exportLatch.unsafeClose()

    if (spanBuffer.length === 0) {
      return Effect.void
    }
    const spans = spanBuffer
    spanBuffer = []
    const data: TraceData = {
      resourceSpans: [{
        resource: otelResource,
        scopeSpans: [{
          scope,
          spans
        }]
      }]
    }
    return Effect.asVoid(client.execute(
      HttpClientRequest.post(options.url, {
        body: HttpBody.unsafeJson(data),
        headers
      })
    ))
  })

  yield* Scope.addFinalizer(exporterScope, Effect.ignore(runExport))

  yield* Effect.sleep(exportInterval).pipe(
    Effect.race(exportLatch.await),
    Effect.zipRight(runExport),
    Effect.catchAllCause((cause) => Effect.logInfo("Failed to export spans", cause)),
    Effect.forever,
    Effect.forkScoped,
    Effect.interruptible,
    Effect.annotateLogs({
      package: "@effect/opentelemetry",
      module: "OtlpExporter"
    })
  )

  const addSpan = (span: SpanImpl) => {
    spanBuffer.push(makeOtlpSpan(span))
    if (spanBuffer.length >= maxBatchSize) {
      exportLatch.unsafeOpen()
    }
  }

  return Tracer.make({
    span(name, parent, context, links, startTime, kind) {
      return makeSpan({
        name,
        parent,
        context,
        status: {
          _tag: "Started",
          startTime
        },
        attributes: new Map(),
        links,
        sampled: true,
        kind,
        export: addSpan
      })
    },
    context(f, _fiber) {
      return f()
    }
  })
})

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = (options: {
  readonly url: string
  readonly name?: string | undefined
  readonly headers?: Headers.Input | undefined
  readonly exportInterval?: Duration.DurationInput | undefined
}): Layer.Layer<never, never, HttpClient.HttpClient | Resource> =>
  Layer.unwrapScoped(Effect.map(make(options), Layer.setTracer))

// internal

interface SpanImpl extends Tracer.Span {
  readonly export: (span: SpanImpl) => void
  readonly attributes: Map<string, unknown>
  readonly links: Array<Tracer.SpanLink>
  readonly events: Array<[name: string, startTime: bigint, attributes: Record<string, unknown> | undefined]>
  status: Tracer.SpanStatus
}

const SpanProto = {
  _tag: "Span",
  end(this: SpanImpl, endTime: bigint, exit: Exit.Exit<unknown, unknown>) {
    this.status = {
      _tag: "Ended",
      startTime: this.status.startTime,
      endTime,
      exit
    }
    this.export(this)
  },
  attribute(this: SpanImpl, key: string, value: unknown) {
    this.attributes.set(key, value)
  },
  event(this: SpanImpl, name: string, startTime: bigint, attributes?: Record<string, unknown>) {
    this.events.push([name, startTime, attributes])
  },
  addLinks(this: SpanImpl, links: ReadonlyArray<Tracer.SpanLink>) {
    // eslint-disable-next-line no-restricted-syntax
    this.links.push(...links)
  }
}

const makeSpan = (options: {
  readonly name: string
  readonly parent: Option.Option<Tracer.AnySpan>
  readonly context: Context.Context<never>
  readonly status: Tracer.SpanStatus
  readonly attributes: ReadonlyMap<string, unknown>
  readonly links: ReadonlyArray<Tracer.SpanLink>
  readonly sampled: boolean
  readonly kind: Tracer.SpanKind
  readonly export: (span: SpanImpl) => void
}): SpanImpl => {
  const self = Object.assign(Object.create(SpanProto), options)
  if (Option.isSome(self.parent)) {
    self.traceId = self.parent.value.traceId
  } else {
    self.traceId = generateId(32)
  }
  self.spanId = generateId(16)
  self.events = []
  return self
}

const generateId = (len: number): string => {
  const chars = "0123456789abcdef"
  let result = ""
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

const makeOtlpSpan = (self: SpanImpl): OtlpSpan => {
  const status = self.status as ExtractTag<Tracer.SpanStatus, "Ended">
  const attributes = entriesToAttributes(self.attributes.entries())
  const events = self.events.map(([name, startTime, attributes]) => ({
    name,
    timeUnixNano: String(startTime),
    attributes: attributes
      ? entriesToAttributes(Object.entries(attributes))
      : [],
    droppedAttributesCount: 0
  }))
  let otelStatus: Status

  if (status.exit._tag === "Success") {
    otelStatus = constOtelStatusSuccess
  } else {
    const errors = Cause.prettyErrors(status.exit.cause)
    const firstError = errors[0]
    otelStatus = {
      code: StatusCode.Error,
      message: firstError && firstError.message
    }
    for (const error of errors) {
      events.push({
        name: "exception",
        timeUnixNano: String(status.endTime),
        droppedAttributesCount: 0,
        attributes: [
          {
            "key": "exception.type",
            "value": {
              "stringValue": error.name
            }
          },
          {
            "key": "exception.message",
            "value": {
              "stringValue": error.message
            }
          },
          {
            "key": "exception.stacktrace",
            "value": {
              "stringValue": error.stack ?? ""
            }
          }
        ]
      })
    }
  }

  return {
    traceId: self.traceId,
    spanId: self.spanId,
    parentSpanId: Option.isSome(self.parent) ? self.parent.value.spanId : undefined,
    name: self.name,
    kind: SpanKind[self.kind],
    startTimeUnixNano: String(status.startTime),
    endTimeUnixNano: String(status.endTime),
    attributes,
    droppedAttributesCount: 0,
    events,
    droppedEventsCount: 0,
    status: otelStatus,
    links: self.links.map((link) => ({
      traceId: link.span.traceId,
      spanId: link.span.spanId,
      attributes: entriesToAttributes(Object.entries(link.attributes)),
      droppedAttributesCount: 0
    })),
    droppedLinksCount: 0
  }
}

const unknownToAttributeValue = (value: unknown): AttributeValue => {
  switch (typeof value) {
    case "string":
      return {
        stringValue: value
      }
    case "bigint":
      return {
        intValue: Number(value)
      }
    case "number":
      return Number.isInteger(value)
        ? {
          intValue: value
        }
        : {
          doubleValue: value
        }
    case "boolean":
      return {
        boolValue: value
      }
    default:
      return {
        stringValue: Inspectable.toStringUnknown(value)
      }
  }
}

const entriesToAttributes = (entries: Iterable<[string, unknown]>): Array<Attribute> => {
  const attributes: Array<Attribute> = []
  for (const [key, value] of entries) {
    attributes.push({
      key,
      value: unknownToAttributeValue(value)
    })
  }
  return attributes
}

interface TraceData {
  readonly resourceSpans: Array<ResourceSpan>
}

interface ResourceSpan {
  readonly resource: OtlpResource
  readonly scopeSpans: Array<ScopeSpan>
}

interface OtlpResource {
  readonly attributes: Array<Attribute>
  readonly droppedAttributesCount: number
}

interface Attribute {
  readonly key: string
  readonly value: AttributeValue
}

type AttributeValue = IntValue | DoubleValue | BoolValue | StringValue

interface IntValue {
  readonly intValue: number
}

interface DoubleValue {
  readonly doubleValue: number
}

interface BoolValue {
  readonly boolValue: boolean
}

interface StringValue {
  readonly stringValue: string
}

interface ScopeSpan {
  readonly scope: Scope
  readonly spans: Array<OtlpSpan>
}

interface Scope {
  readonly name: string
}

interface OtlpSpan {
  readonly traceId: string
  readonly spanId: string
  readonly parentSpanId: string | undefined
  readonly name: string
  readonly kind: number
  readonly startTimeUnixNano: string
  readonly endTimeUnixNano: string
  readonly attributes: Array<Attribute>
  readonly droppedAttributesCount: number
  readonly events: Array<Event>
  readonly droppedEventsCount: number
  readonly status: Status
  readonly links: Array<Link>
  readonly droppedLinksCount: number
}

interface Event {
  readonly attributes: Array<Attribute>
  readonly name: string
  readonly timeUnixNano: string
  readonly droppedAttributesCount: number
}

interface Link {
  readonly attributes: Array<Attribute>
  readonly spanId: string
  readonly traceId: string
  readonly droppedAttributesCount: number
}

interface Status {
  readonly code: StatusCode
  readonly message?: string
}

const enum StatusCode {
  Unset = 0,
  Ok = 1,
  Error = 2
}

enum SpanKind {
  unspecified = 0,
  internal = 1,
  server = 2,
  client = 3,
  producer = 4,
  consumer = 5
}

const constOtelStatusSuccess: Status = {
  code: StatusCode.Ok
}
