import type { Option } from "@effect/data/Option"
import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import type { Exit } from "@effect/io/Exit"
import * as Layer from "@effect/io/Layer"
import * as Tracer from "@effect/io/Tracer"
import type { TracerOptions } from "@effect/opentelemetry/Tracer"
import * as OtelApi from "@opentelemetry/api"

/** @internal */
export class OtelSpan implements Tracer.Span {
  readonly _tag = "Span"

  readonly span: OtelApi.Span
  readonly spanId: string
  readonly traceId: string
  readonly attributes = new Map<string, string>()
  status: Tracer.SpanStatus

  constructor(
    traceApi: OtelApi.TraceAPI,
    contextApi: OtelApi.ContextAPI,
    tracer: OtelApi.Tracer,
    readonly name: string,
    readonly parent: Option<Tracer.ParentSpan>,
    startTime: number
  ) {
    const active = contextApi.active()
    this.span = parent._tag === "Some"
      ? tracer.startSpan(
        name,
        { startTime },
        parent.value instanceof OtelSpan ?
          traceApi.setSpan(active, parent.value.span) :
          traceApi.setSpanContext(active, {
            spanId: parent.value.spanId,
            traceId: parent.value.traceId,
            isRemote: parent.value._tag === "ExternalSpan",
            traceFlags: OtelApi.TraceFlags.SAMPLED
          })
      )
      : tracer.startSpan(name, { startTime }, active)
    const spanContext = this.span.spanContext()

    this.spanId = spanContext.spanId
    this.traceId = spanContext.traceId

    this.status = {
      _tag: "Started",
      startTime
    }
  }

  attribute(key: string, value: string) {
    this.span.setAttribute(key, value)
    this.attributes.set(key, value)
  }

  end(endTime: number, exit: Exit<unknown, unknown>) {
    this.status = {
      _tag: "Ended",
      endTime,
      exit,
      startTime: this.status.startTime
    }

    if (exit._tag === "Success") {
      this.span.setStatus({
        code: OtelApi.SpanStatusCode.OK
      })
    } else {
      if (Cause.isInterruptedOnly(exit.cause)) {
        this.span.setStatus({
          code: OtelApi.SpanStatusCode.OK
        })
      } else {
        this.span.setStatus({
          code: OtelApi.SpanStatusCode.ERROR,
          message: Cause.pretty(exit.cause)
        })
      }
    }
    this.span.end(endTime)
  }

  event(name: string, attributes?: Record<string, string>) {
    this.span.addEvent(name, attributes)
  }
}

/** @internal */
export const make = (options: TracerOptions) =>
  Effect.map(
    Effect.sync(() => OtelApi.trace.getTracer(options.name, options.version)),
    (tracer) =>
      Tracer.make({
        span(name, parent, startTime) {
          return new OtelSpan(
            OtelApi.trace,
            OtelApi.context,
            tracer,
            name,
            parent,
            startTime
          )
        }
      })
  )

/** @internal */
export const layer = (options: TracerOptions) =>
  Layer.unwrapEffect(
    Effect.map(make(options), Effect.setTracer)
  )
