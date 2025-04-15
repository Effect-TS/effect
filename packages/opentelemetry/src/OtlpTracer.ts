/**
 * @since 1.0.0
 */
import * as Headers from "@effect/platform/Headers"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as Cause from "effect/Cause"
import type * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import * as FiberSet from "effect/FiberSet"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schedule from "effect/Schedule"
import * as Scope from "effect/Scope"
import * as Tracer from "effect/Tracer"
import type { ExtractTag } from "effect/Types"
import type { KeyValue, Resource } from "./OtlpResource.js"
import { entriesToAttributes } from "./OtlpResource.js"
import * as OtlpResource from "./OtlpResource.js"

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make: (
  options: {
    readonly url: string
    readonly resource: {
      readonly serviceName: string
      readonly serviceVersion?: string | undefined
      readonly attributes?: Record<string, unknown>
    }
    readonly headers?: Headers.Input | undefined
    readonly exportInterval?: Duration.DurationInput | undefined
    readonly maxBatchSize?: number | undefined
  }
) => Effect.Effect<
  Tracer.Tracer,
  never,
  HttpClient.HttpClient | Scope.Scope
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
    "user-agent": "effect-opentelemetry-OtlpTracer/0.0.0"
  })
  if (options.headers) {
    headers = Headers.merge(Headers.fromInput(options.headers), headers)
  }

  const otelResource = OtlpResource.make(options.resource)
  const scope: Scope = {
    name: options.resource.serviceName
  }

  let spanBuffer: Array<OtlpSpan> = []

  const request = HttpClientRequest.post(options.url, {
    headers
  })
  const runExport = Effect.suspend(() => {
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
      HttpClientRequest.bodyUnsafeJson(request, data)
    ))
  }).pipe(
    Effect.tapErrorCause((cause) => Effect.logWarning("Failed to export spans", cause)),
    Effect.annotateLogs({
      package: "@effect/opentelemetry",
      module: "OtlpTracer"
    })
  )

  yield* Scope.addFinalizer(exporterScope, Effect.ignore(runExport))

  yield* Effect.sleep(exportInterval).pipe(
    Effect.zipRight(runExport),
    Effect.forever,
    Effect.retry(Schedule.spaced("1 minute")),
    Effect.forkIn(exporterScope),
    Effect.interruptible
  )

  const runFork = yield* FiberSet.makeRuntime().pipe(
    Effect.interruptible
  )
  const addSpan = (span: SpanImpl) => {
    spanBuffer.push(makeOtlpSpan(span))
    if (spanBuffer.length >= maxBatchSize) {
      runFork(runExport)
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
  readonly resource: {
    readonly serviceName: string
    readonly serviceVersion?: string | undefined
    readonly attributes?: Record<string, unknown>
  }
  readonly headers?: Headers.Input | undefined
  readonly exportInterval?: Duration.DurationInput | undefined
  readonly maxBatchSize?: number | undefined
}): Layer.Layer<never, never, HttpClient.HttpClient> => Layer.unwrapScoped(Effect.map(make(options), Layer.setTracer))

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
      code: StatusCode.Error
    }
    if (firstError) {
      otelStatus.message = firstError.message
      events.push({
        name: "exception",
        timeUnixNano: String(status.endTime),
        droppedAttributesCount: 0,
        attributes: [
          {
            "key": "exception.type",
            "value": {
              "stringValue": firstError.name
            }
          },
          {
            "key": "exception.message",
            "value": {
              "stringValue": firstError.message
            }
          },
          {
            "key": "exception.stacktrace",
            "value": {
              "stringValue": Cause.pretty(status.exit.cause, { renderErrorCause: true })
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

interface TraceData {
  readonly resourceSpans: Array<ResourceSpan>
}

interface ResourceSpan {
  readonly resource: Resource
  readonly scopeSpans: Array<ScopeSpan>
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
  readonly attributes: Array<KeyValue>
  readonly droppedAttributesCount: number
  readonly events: Array<Event>
  readonly droppedEventsCount: number
  readonly status: Status
  readonly links: Array<Link>
  readonly droppedLinksCount: number
}

interface Event {
  readonly attributes: Array<KeyValue>
  readonly name: string
  readonly timeUnixNano: string
  readonly droppedAttributesCount: number
}

interface Link {
  readonly attributes: Array<KeyValue>
  readonly spanId: string
  readonly traceId: string
  readonly droppedAttributesCount: number
}

interface Status {
  readonly code: StatusCode
  message?: string
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
