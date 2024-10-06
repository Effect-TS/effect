import * as OtelApi from "@opentelemetry/api"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type { Exit } from "effect/Exit"
import { dual } from "effect/Function"
import * as Inspectable from "effect/Inspectable"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as EffectTracer from "effect/Tracer"
import { Resource } from "../Resource.js"

const OtelSpanTypeId = Symbol.for("@effect/opentelemetry/Tracer/OtelSpan")

const kindMap = {
  "internal": OtelApi.SpanKind.INTERNAL,
  "client": OtelApi.SpanKind.CLIENT,
  "server": OtelApi.SpanKind.SERVER,
  "producer": OtelApi.SpanKind.PRODUCER,
  "consumer": OtelApi.SpanKind.CONSUMER
}

/** @internal */
export class OtelSpan implements EffectTracer.Span {
  readonly [OtelSpanTypeId]: typeof OtelSpanTypeId
  readonly _tag = "Span"

  readonly span: OtelApi.Span
  readonly spanId: string
  readonly traceId: string
  readonly attributes = new Map<string, unknown>()
  readonly sampled: boolean
  status: EffectTracer.SpanStatus

  constructor(
    contextApi: OtelApi.ContextAPI,
    tracer: OtelApi.Tracer,
    readonly name: string,
    readonly parent: Option.Option<EffectTracer.AnySpan>,
    readonly context: Context.Context<never>,
    readonly links: ReadonlyArray<EffectTracer.SpanLink>,
    startTime: bigint,
    readonly kind: EffectTracer.SpanKind
  ) {
    this[OtelSpanTypeId] = OtelSpanTypeId
    const active = contextApi.active()
    this.span = tracer.startSpan(
      name,
      {
        startTime: nanosToHrTime(startTime),
        links: links.length > 0
          ? links.map((link) => ({
            context: makeSpanContext(link.span),
            attributes: recordToAttributes(link.attributes)
          }))
          : undefined as any,
        kind: kindMap[this.kind]
      },
      parent._tag === "Some"
        ? populateContext(active, parent.value, context)
        : OtelApi.trace.deleteSpan(active)
    )
    const spanContext = this.span.spanContext()
    this.spanId = spanContext.spanId
    this.traceId = spanContext.traceId
    this.status = {
      _tag: "Started",
      startTime
    }
    this.sampled = (spanContext.traceFlags & OtelApi.TraceFlags.SAMPLED) === OtelApi.TraceFlags.SAMPLED
  }

  attribute(key: string, value: unknown) {
    this.span.setAttribute(key, unknownToAttributeValue(value))
    this.attributes.set(key, value)
  }

  end(endTime: bigint, exit: Exit<unknown, unknown>) {
    const hrTime = nanosToHrTime(endTime)
    this.status = {
      _tag: "Ended",
      endTime,
      exit,
      startTime: this.status.startTime
    }

    if (exit._tag === "Success") {
      this.span.setStatus({ code: OtelApi.SpanStatusCode.OK })
    } else {
      if (Cause.isInterruptedOnly(exit.cause)) {
        this.span.setStatus({
          code: OtelApi.SpanStatusCode.OK,
          message: Cause.pretty(exit.cause)
        })
        this.span.setAttribute("span.label", "⚠︎ Interrupted")
        this.span.setAttribute("status.interrupted", true)
      } else {
        const errors = Cause.prettyErrors(exit.cause)
        if (errors.length > 0) {
          for (const error of errors) {
            this.span.recordException(error, hrTime)
          }
          this.span.setStatus({
            code: OtelApi.SpanStatusCode.ERROR,
            message: errors[0].message
          })
        } else {
          // empty cause means no error
          this.span.setStatus({ code: OtelApi.SpanStatusCode.OK })
        }
      }
    }
    this.span.end(hrTime)
  }

  event(name: string, startTime: bigint, attributes?: Record<string, unknown>) {
    this.span.addEvent(
      name,
      attributes ? recordToAttributes(attributes) : undefined,
      nanosToHrTime(startTime)
    )
  }
}

/** @internal */
export const TracerProvider = Context.GenericTag<OtelApi.TracerProvider>("@effect/opentelemetry/Tracer/TracerProvider")

/** @internal */
export const Tracer = Context.GenericTag<OtelApi.Tracer>("@effect/opentelemetry/Tracer/Tracer")

/** @internal */
export const make = Effect.map(Tracer, (tracer) =>
  EffectTracer.make({
    span(name, parent, context, links, startTime, kind) {
      return new OtelSpan(
        OtelApi.context,
        tracer,
        name,
        parent,
        context,
        links,
        startTime,
        kind
      )
    },
    context(execution, fiber) {
      const currentSpan = fiber.currentSpan

      if (currentSpan === undefined) {
        return execution()
      }

      return OtelApi.context.with(
        populateContext(OtelApi.context.active(), currentSpan),
        execution
      )
    }
  }))

/** @internal */
export const traceFlagsTag = Context.GenericTag<OtelApi.TraceFlags>("@effect/opentelemetry/traceFlags")

/** @internal */
export const traceStateTag = Context.GenericTag<OtelApi.TraceState>("@effect/opentelemetry/traceState")

/** @internal */
export const makeExternalSpan = (options: {
  readonly traceId: string
  readonly spanId: string
  readonly traceFlags?: number | undefined
  readonly traceState?: string | OtelApi.TraceState | undefined
}): EffectTracer.ExternalSpan => {
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
    sampled: options.traceFlags
      ? (options.traceFlags & OtelApi.TraceFlags.SAMPLED) === OtelApi.TraceFlags.SAMPLED
      : true,
    context
  }
}

/** @internal */
export const currentOtelSpan = Effect.flatMap(
  Effect.currentSpan,
  (span) => {
    if (OtelSpanTypeId in span) {
      return Effect.succeed((span as OtelSpan).span)
    }
    return Effect.fail(new Cause.NoSuchElementException())
  }
)

/** @internal */
export const layerGlobalProvider = Layer.sync(
  TracerProvider,
  () => OtelApi.trace.getTracerProvider()
)

/** @internal */
export const layerTracer = Layer.effect(
  Tracer,
  Effect.flatMap(
    Effect.zip(Resource, TracerProvider),
    ([resource, provider]) =>
      Effect.sync(() =>
        provider.getTracer(
          resource.attributes["service.name"] as string,
          resource.attributes["service.version"] as string
        )
      )
  )
)

/** @internal */
export const layerGlobalTracer = layerTracer.pipe(
  Layer.provide(layerGlobalProvider)
)

/** @internal */
export const layerGlobal = Layer.unwrapEffect(Effect.map(make, Layer.setTracer)).pipe(
  Layer.provide(layerGlobalTracer)
)

/** @internal */
export const layer = Layer.unwrapEffect(Effect.map(make, Layer.setTracer)).pipe(
  Layer.provide(layerTracer)
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
  span: EffectTracer.AnySpan,
  context?: Context.Context<never>
): OtelApi.Context =>
  span instanceof OtelSpan ?
    OtelApi.trace.setSpan(otelContext, span.span) :
    OtelApi.trace.setSpanContext(otelContext, makeSpanContext(span, context))

const makeSpanContext = (span: EffectTracer.AnySpan, context?: Context.Context<never>): OtelApi.SpanContext => ({
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
  ) as OtelApi.TraceState
})

const extractTraceTag = <I, S>(
  parent: EffectTracer.AnySpan,
  context: Context.Context<never>,
  tag: Context.Tag<I, S>
) =>
  Option.orElse(
    Context.getOption(context, tag),
    () => Context.getOption(parent.context, tag)
  )

const recordToAttributes = (value: Record<string, unknown>): OtelApi.Attributes => {
  return Object.entries(value).reduce((acc, [key, value]) => {
    acc[key] = unknownToAttributeValue(value)
    return acc
  }, {} as OtelApi.Attributes)
}

const unknownToAttributeValue = (value: unknown): OtelApi.AttributeValue => {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value
  } else if (typeof value === "bigint") {
    return Number(value)
  }
  return Inspectable.toStringUnknown(value)
}

/** @internal */
export const withSpanContext = dual<
  (
    spanContext: OtelApi.SpanContext
  ) => <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, EffectTracer.ParentSpan>>,
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    spanContext: OtelApi.SpanContext
  ) => Effect.Effect<A, E, Exclude<R, EffectTracer.ParentSpan>>
>(2, <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  spanContext: OtelApi.SpanContext
): Effect.Effect<A, E, Exclude<R, EffectTracer.ParentSpan>> =>
  Effect.withParentSpan(effect, makeExternalSpan(spanContext)))
