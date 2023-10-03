import * as OtelApi from "@opentelemetry/api"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type { Exit } from "effect/Exit"
import * as FiberRef from "effect/FiberRef"
import * as FiberRefs from "effect/FiberRefs"
import * as Layer from "effect/Layer"
import * as List from "effect/List"
import * as Option from "effect/Option"
import * as Tracer from "effect/Tracer"
import { Resource } from "../Resource"

/** @internal */
export class OtelSpan implements Tracer.Span {
  readonly _tag = "Span"

  readonly span: OtelApi.Span
  readonly spanId: string
  readonly traceId: string
  readonly attributes = new Map<string, Tracer.AttributeValue>()
  status: Tracer.SpanStatus

  constructor(
    contextApi: OtelApi.ContextAPI,
    tracer: OtelApi.Tracer,
    readonly name: string,
    readonly parent: Option.Option<Tracer.ParentSpan>,
    readonly context: Context.Context<never>,
    readonly links: ReadonlyArray<Tracer.SpanLink>,
    startTime: bigint
  ) {
    const active = contextApi.active()
    this.span = tracer.startSpan(name, {
      startTime: nanosToHrTime(startTime),
      links: links.length > 0
        ? links.map((link) => ({
          context: makeSpanContext(link.span),
          attributes: link.attributes
        }))
        : undefined
    }, parent._tag === "Some" ? populateContext(active, parent.value, context) : active)
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
          code: OtelApi.SpanStatusCode.OK,
          message: Cause.pretty(exit.cause)
        })
        this.span.setAttribute("span.label", "⚠︎ Interrupted")
        this.span.setAttribute("status.interrupted", true)
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
export const OtelTracer = Context.Tag<OtelApi.Tracer>("@effect/opentelemetry/Tracer/OtelTracer")

/** @internal */
export const make = Effect.map(OtelTracer, (tracer) =>
  Tracer.make({
    span(name, parent, context, links, startTime) {
      return new OtelSpan(
        OtelApi.context,
        tracer,
        name,
        parent,
        context,
        links,
        startTime
      )
    },
    context(execution, fiber) {
      const currentSpan = Option.flatMap(
        FiberRefs.get(
          fiber.getFiberRefs(),
          FiberRef.currentTracerSpan
        ),
        List.head
      )

      if (currentSpan._tag === "None") {
        return execution()
      }

      return OtelApi.context.with(
        populateContext(OtelApi.context.active(), currentSpan.value),
        execution
      )
    }
  }))

/** @internal */

/** @internal */
export const traceFlagsTag = Context.Tag<OtelApi.TraceFlags>("@effect/opentelemetry/traceFlags")

/** @internal */
export const traceStateTag = Context.Tag<OtelApi.TraceState>("@effect/opentelemetry/traceState")

/** @internal */
export const makeExternalSpan = (options: {
  readonly traceId: string
  readonly spanId: string
  readonly traceFlags?: number
  readonly traceState?: string | OtelApi.TraceState
}): Tracer.ExternalSpan => {
  let context = Context.empty()

  if (options.traceFlags) {
    context = Context.add(context, traceFlagsTag, options.traceFlags)
  }

  if (typeof options.traceState === "string") {
    context = Option.match(createTraceState(options.traceState), {
      onNone: () => context,
      onSome: (traceState) => Context.add(context, traceStateTag, traceState)
    })
  } else if (options.traceState) {
    context = Context.add(context, traceStateTag, options.traceState)
  }

  return {
    _tag: "ExternalSpan",
    traceId: options.traceId,
    spanId: options.spanId,
    context
  }
}

/** @internal */
export const currentOtelSpan = Effect.map(
  Effect.currentSpan,
  (span) =>
    Option.map(
      Option.filter(span, (span): span is OtelSpan => "span" in span),
      (_) => _.span
    )
)

/** @internal */
export const layerOtelTracer = Layer.effect(
  OtelTracer,
  Effect.flatMap(
    Resource,
    (resource) =>
      Effect.sync(() =>
        OtelApi.trace.getTracer(
          resource.attributes["service.name"] as string,
          resource.attributes["service.version"] as string
        )
      )
  )
)

/** @internal */
export const layer = Layer.provide(
  layerOtelTracer,
  Layer.unwrapEffect(Effect.map(make, Effect.setTracer))
)

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

const bigint1e9 = 1_000_000_000n
const nanosToHrTime = (timestamp: bigint): OtelApi.HrTime => {
  return [Number(timestamp / bigint1e9), Number(timestamp % bigint1e9)]
}

const createTraceState = Option.liftThrowable(OtelApi.createTraceState)

const populateContext = (
  otelContext: OtelApi.Context,
  span: Tracer.ParentSpan,
  context?: Context.Context<never>
): OtelApi.Context =>
  span instanceof OtelSpan ?
    OtelApi.trace.setSpan(otelContext, span.span) :
    OtelApi.trace.setSpanContext(otelContext, makeSpanContext(span, context))

const makeSpanContext = (span: Tracer.ParentSpan, context?: Context.Context<never>): OtelApi.SpanContext => ({
  spanId: span.spanId,
  traceId: span.traceId,
  isRemote: span._tag === "ExternalSpan",
  traceFlags: Option.getOrElse(
    context ?
      extractTraceTag(span, context, traceFlagsTag) :
      Context.getOption(span.context, traceFlagsTag),
    () => OtelApi.TraceFlags.SAMPLED
  ),
  traceState: Option.getOrUndefined(
    context ?
      extractTraceTag(span, context, traceStateTag) :
      Context.getOption(span.context, traceStateTag)
  )
})

const extractTraceTag = <I, S>(
  parent: Tracer.ParentSpan,
  context: Context.Context<never>,
  tag: Context.Tag<I, S>
) =>
  Option.orElse(
    Context.getOption(context, tag),
    () => Context.getOption(parent.context, tag)
  )
