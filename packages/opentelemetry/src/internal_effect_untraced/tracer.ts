import * as Context from "@effect/data/Context"
import { pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import type { Exit } from "@effect/io/Exit"
import * as Layer from "@effect/io/Layer"
import * as Tracer from "@effect/io/Tracer"
import { Resource } from "@effect/opentelemetry/Resource"
import * as OtelApi from "@opentelemetry/api"

/** @internal */
export class OtelSpan implements Tracer.Span {
  readonly _tag = "Span"

  readonly span: OtelApi.Span
  readonly spanId: string
  readonly traceId: string
  readonly attributes = new Map<string, Tracer.AttributeValue>()
  status: Tracer.SpanStatus

  constructor(
    traceApi: OtelApi.TraceAPI,
    contextApi: OtelApi.ContextAPI,
    tracer: OtelApi.Tracer,
    readonly name: string,
    readonly parent: Option.Option<Tracer.ParentSpan>,
    readonly context: Context.Context<never>,
    startTime: bigint
  ) {
    const active = contextApi.active()
    this.span = parent._tag === "Some"
      ? tracer.startSpan(
        name,
        { startTime: nanosToHrTime(startTime) },
        parent.value instanceof OtelSpan ?
          traceApi.setSpan(active, parent.value.span) :
          traceApi.setSpanContext(active, {
            spanId: parent.value.spanId,
            traceId: parent.value.traceId,
            isRemote: parent.value._tag === "ExternalSpan",
            traceFlags: Option.getOrElse(
              extractTraceTag(parent, context, traceFlagsTag),
              () => OtelApi.TraceFlags.SAMPLED
            ),
            traceState: Option.getOrUndefined(extractTraceTag(parent, context, traceStateTag))
          })
      )
      : tracer.startSpan(name, { startTime: nanosToHrTime(startTime) }, active)
    const spanContext = this.span.spanContext()

    this.spanId = spanContext.spanId
    this.traceId = spanContext.traceId

    this.status = {
      _tag: "Started",
      startTime
    }
  }

  attribute(key: string, value: Tracer.AttributeValue) {
    this.span.setAttribute(key, value)
    this.attributes.set(key, value)
  }

  end(endTime: bigint, exit: Exit<unknown, unknown>) {
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
    this.span.end(nanosToHrTime(endTime))
  }

  event(name: string, startTime: bigint, attributes?: Record<string, Tracer.AttributeValue>) {
    this.span.addEvent(name, attributes, nanosToHrTime(startTime))
  }
}

/** @internal */
export const make = pipe(
  Resource,
  Effect.flatMap((resource) =>
    Effect.sync(() =>
      OtelApi.trace.getTracer(
        resource.attributes["service.name"] as string,
        resource.attributes["service.version"] as string
      )
    )
  ),
  Effect.map((tracer) =>
    Tracer.make({
      span(name, parent, context, startTime) {
        return new OtelSpan(
          OtelApi.trace,
          OtelApi.context,
          tracer,
          name,
          parent,
          context,
          startTime
        )
      }
    })
  )
)

/** @internal */
export const layer = Layer.unwrapEffect(
  Effect.map(make, Effect.setTracer)
)

/** @internal */
export const traceFlagsTag = Context.Tag<OtelApi.TraceFlags>("@effect/opentelemetry/traceFlags")

/** @internal */
export const traceStateTag = Context.Tag<OtelApi.TraceState>("@effect/opentelemetry/traceState")

/** @internal */
export const makeExternalSpan = (options: {
  readonly name: string
  readonly traceId: string
  readonly spanId: string
  readonly traceFlags?: number
  readonly traceState?: string
}): Tracer.ExternalSpan => {
  let context = Context.empty()

  if (options.traceFlags) {
    context = Context.add(context, traceFlagsTag, options.traceFlags)
  }

  if (options.traceState) {
    context = Option.match(
      createTraceState(options.traceState),
      () => context,
      (traceState) => Context.add(context, traceStateTag, traceState)
    )
  }

  return {
    _tag: "ExternalSpan",
    name: options.name,
    traceId: options.traceId,
    spanId: options.spanId,
    context
  }
}

const oneE9 = 1_000_000_000n
const nanosToHrTime = (timestamp: bigint): OtelApi.HrTime => {
  const nanos = timestamp % oneE9
  const seconds = Number((timestamp - nanos) / oneE9)
  return [seconds, Number(nanos)]
}

const extractTraceTag = <I, S>(
  parent: Option.Option<Tracer.ParentSpan>,
  context: Context.Context<never>,
  tag: Context.Tag<I, S>
) =>
  Option.orElse(
    Context.getOption(context, tag),
    () =>
      Option.flatMap(
        parent,
        (parent) => Context.getOption(parent.context, tag)
      )
  )

const createTraceState = Option.liftThrowable(OtelApi.createTraceState)
