/**
 * @since 1.0.0
 */
import type * as Headers from "@effect/platform/Headers"
import type * as HttpClient from "@effect/platform/HttpClient"
import * as Cause from "effect/Cause"
import type * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as Scope from "effect/Scope"
import * as Tracer from "effect/Tracer"
import type { ExtractTag } from "effect/Types"
import * as Exporter from "./internal/otlpExporter.js"
import type { KeyValue, Resource } from "./OtlpResource.js"
import { entriesToAttributes } from "./OtlpResource.js"
import * as OtlpResource from "./OtlpResource.js"

const ATTR_EXCEPTION_TYPE = "exception.type"
const ATTR_EXCEPTION_MESSAGE = "exception.message"
const ATTR_EXCEPTION_STACKTRACE = "exception.stacktrace"

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
    readonly context?: (<X>(f: () => X, span: Tracer.AnySpan) => X) | undefined
    readonly shutdownTimeout?: Duration.DurationInput | undefined
  }
) => Effect.Effect<
  Tracer.Tracer,
  never,
  HttpClient.HttpClient | Scope.Scope
> = Effect.fnUntraced(function*(options) {
  const otelResource = yield* OtlpResource.fromConfig(options.resource)
  const scope: Scope = {
    name: OtlpResource.unsafeServiceName(otelResource)
  }

  const exporter = yield* Exporter.make({
    label: "OtlpTracer",
    url: options.url,
    headers: options.headers,
    exportInterval: options.exportInterval ?? Duration.seconds(5),
    maxBatchSize: options.maxBatchSize ?? 1000,
    body(spans) {
      const data: TraceData = {
        resourceSpans: [{
          resource: otelResource,
          scopeSpans: [{
            scope,
            spans
          }]
        }]
      }
      return data
    },
    shutdownTimeout: options.shutdownTimeout ?? Duration.seconds(3)
  })

  const exportFn = (span: SpanImpl) => {
    exporter.push(makeOtlpSpan(span))
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
        export: exportFn
      })
    },
    context: options.context ?
      function(f, fiber) {
        if (fiber.currentSpan === undefined) {
          return f()
        }
        return options.context!(f, fiber.currentSpan)
      } :
      defaultContext
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
  readonly headers?: Headers.Input | undefined
  readonly exportInterval?: Duration.DurationInput | undefined
  readonly maxBatchSize?: number | undefined
  readonly context?: (<X>(f: () => X, span: Tracer.AnySpan) => X) | undefined
  readonly shutdownTimeout?: Duration.DurationInput | undefined
}): Layer.Layer<never, never, HttpClient.HttpClient> => Layer.unwrapScoped(Effect.map(make(options), Layer.setTracer))

// internal

function defaultContext<X>(f: () => X, _: any): X {
  return f()
}

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
  } else if (Cause.isInterruptedOnly(status.exit.cause)) {
    otelStatus = {
      code: StatusCode.Ok,
      message: Cause.pretty(status.exit.cause)
    }
  } else {
    const errors = Cause.prettyErrors(status.exit.cause)
    const firstError = errors[0]
    otelStatus = {
      code: StatusCode.Error
    }
    attributes.push({
      key: "span.label",
      value: { stringValue: "⚠︎ Interrupted" }
    }, {
      key: "status.interrupted",
      value: { boolValue: true }
    })
    if (firstError) {
      otelStatus.message = firstError.message
      events.push({
        name: "exception",
        timeUnixNano: String(status.endTime),
        droppedAttributesCount: 0,
        attributes: [
          {
            "key": ATTR_EXCEPTION_TYPE,
            "value": {
              "stringValue": firstError.name
            }
          },
          {
            "key": ATTR_EXCEPTION_MESSAGE,
            "value": {
              "stringValue": firstError.message
            }
          },
          {
            "key": ATTR_EXCEPTION_STACKTRACE,
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
