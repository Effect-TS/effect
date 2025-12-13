import * as OtelApi from "@opentelemetry/api"
import * as OtelSemConv from "@opentelemetry/semantic-conventions"
import * as Cause from "effect/Cause"
import type * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { constTrue, dual } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as EffectTracer from "effect/Tracer"
import { Resource } from "../Resource.js"
import type { OtelTraceFlags, OtelTracer, OtelTracerProvider, OtelTraceState } from "../Tracer.js"
import { nanosToHrTime, recordToAttributes, unknownToAttributeValue } from "./utils.js"

const OtelSpanTypeId = Symbol.for("@effect/opentelemetry/Tracer/OtelSpan")

const kindMap = {
  "internal": OtelApi.SpanKind.INTERNAL,
  "client": OtelApi.SpanKind.CLIENT,
  "server": OtelApi.SpanKind.SERVER,
  "producer": OtelApi.SpanKind.PRODUCER,
  "consumer": OtelApi.SpanKind.CONSUMER
}

const getOtelParent = (tracer: OtelApi.TraceAPI, otelContext: OtelApi.Context, context: Context.Context<never>) => {
  const active = tracer.getSpan(otelContext)
  const otelParent = active ? active.spanContext() : undefined
  return otelParent
    ? Option.some(
      EffectTracer.externalSpan({
        spanId: otelParent.spanId,
        traceId: otelParent.traceId,
        sampled: (otelParent.traceFlags & 1) === 1,
        context
      })
    )
    : Option.none()
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
  readonly parent: Option.Option<EffectTracer.AnySpan>
  status: EffectTracer.SpanStatus

  constructor(
    contextApi: OtelApi.ContextAPI,
    traceApi: OtelApi.TraceAPI,
    tracer: OtelApi.Tracer,
    readonly name: string,
    effectParent: Option.Option<EffectTracer.AnySpan>,
    readonly context: Context.Context<never>,
    readonly links: Array<EffectTracer.SpanLink>,
    startTime: bigint,
    readonly kind: EffectTracer.SpanKind,
    options?: EffectTracer.SpanOptions
  ) {
    this[OtelSpanTypeId] = OtelSpanTypeId
    const active = contextApi.active()
    this.parent = effectParent._tag === "Some"
      ? effectParent
      : (options?.root !== true)
      ? getOtelParent(traceApi, active, context)
      : Option.none()
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
      this.parent._tag === "Some"
        ? populateContext(active, this.parent.value, context)
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

  addLinks(links: ReadonlyArray<EffectTracer.SpanLink>): void {
    // eslint-disable-next-line no-restricted-syntax
    this.links.push(...links)
    this.span.addLinks(links.map((link) => ({
      context: makeSpanContext(link.span),
      attributes: recordToAttributes(link.attributes)
    })))
  }

  end(endTime: bigint, exit: Exit.Exit<unknown, unknown>) {
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
        const firstError = Cause.prettyErrors(exit.cause)[0]
        if (firstError) {
          firstError.stack = Cause.pretty(exit.cause, { renderErrorCause: true })
          this.span.recordException(firstError, hrTime)
          this.span.setStatus({
            code: OtelApi.SpanStatusCode.ERROR,
            message: firstError.message
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
export const TracerProvider = Context.GenericTag<OtelTracerProvider, OtelApi.TracerProvider>(
  "@effect/opentelemetry/Tracer/OtelTracerProvider"
)

/** @internal */
export const Tracer = Context.GenericTag<OtelTracer, OtelApi.Tracer>("@effect/opentelemetry/Tracer/OtelTracer")

/** @internal */
export const make = Effect.map(Tracer, (tracer) =>
  EffectTracer.make({
    span(name, parent, context, links, startTime, kind, options) {
      return new OtelSpan(
        OtelApi.context,
        OtelApi.trace,
        tracer,
        name,
        parent,
        context,
        links.slice(),
        startTime,
        kind,
        options
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
export const traceFlagsTag = Context.GenericTag<OtelTraceFlags, OtelApi.TraceFlags>(
  "@effect/opentelemetry/Tracer/OtelTraceFlags"
)

/** @internal */
export const traceStateTag = Context.GenericTag<OtelTraceState, OtelApi.TraceState>(
  "@effect/opentelemetry/Tracer/OtelTraceState"
)

/** @internal */
export const makeExternalSpan = (options: {
  readonly traceId: string
  readonly spanId: string
  readonly traceFlags?: number | undefined
  readonly traceState?: string | OtelApi.TraceState | undefined
}): EffectTracer.ExternalSpan => {
  let context = Context.empty()

  if (options.traceFlags !== undefined) {
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
    sampled: options.traceFlags !== undefined
      ? (options.traceFlags & OtelApi.TraceFlags.SAMPLED) === OtelApi.TraceFlags.SAMPLED
      : true,
    context
  }
}

const makeOtelSpan = (span: EffectTracer.Span, clock: Clock.Clock): OtelApi.Span => {
  const spanContext: OtelApi.SpanContext = {
    traceId: span.traceId,
    spanId: span.spanId,
    traceFlags: span.sampled ? OtelApi.TraceFlags.SAMPLED : OtelApi.TraceFlags.NONE,
    isRemote: false
  }

  let exit = Exit.void

  const self: OtelApi.Span = {
    spanContext: () => spanContext,
    setAttribute(key, value) {
      span.attribute(key, value)
      return self
    },
    setAttributes(attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        span.attribute(key, value)
      }
      return self
    },
    addEvent(name) {
      let attributes: OtelApi.Attributes | undefined = undefined
      let startTime: OtelApi.TimeInput | undefined = undefined
      if (arguments.length === 3) {
        attributes = arguments[1]
        startTime = arguments[2]
      } else {
        startTime = arguments[1]
      }
      span.event(name, convertOtelTimeInput(startTime, clock), attributes)
      return self
    },
    addLink(link) {
      span.addLinks([{
        _tag: "SpanLink",
        span: makeExternalSpan(link.context),
        attributes: link.attributes ?? {}
      }])
      return self
    },
    addLinks(links) {
      span.addLinks(links.map((link) => ({
        _tag: "SpanLink",
        span: makeExternalSpan(link.context),
        attributes: link.attributes ?? {}
      })))
      return self
    },
    setStatus(status) {
      exit = OtelApi.SpanStatusCode.ERROR
        ? Exit.die(status.message ?? "Unknown error")
        : Exit.void
      return self
    },
    updateName: () => self,
    end(endTime) {
      const time = convertOtelTimeInput(endTime, clock)
      span.end(time, exit)
      return self
    },
    isRecording: constTrue,
    recordException(exception, timeInput) {
      const time = convertOtelTimeInput(timeInput, clock)
      const cause = Cause.fail(exception)
      const error = Cause.prettyErrors(cause)[0]
      span.event(error.message, time, {
        "exception.type": error.name,
        "exception.message": error.message,
        "exception.stacktrace": error.stack ?? ""
      })
    }
  }
  return self
}

const bigint1e6 = BigInt(1_000_000)
const bigint1e9 = BigInt(1_000_000_000)

const convertOtelTimeInput = (input: OtelApi.TimeInput | undefined, clock: Clock.Clock): bigint => {
  if (input === undefined) {
    return clock.unsafeCurrentTimeNanos()
  } else if (typeof input === "number") {
    return BigInt(Math.round(input * 1_000_000))
  } else if (input instanceof Date) {
    return BigInt(input.getTime()) * bigint1e6
  }
  const [seconds, nanos] = input
  return BigInt(seconds) * bigint1e9 + BigInt(nanos)
}

/** @internal */
export const currentOtelSpan: Effect.Effect<OtelApi.Span, Cause.NoSuchElementException> = Effect.clockWith((clock) =>
  Effect.map(Effect.currentSpan, (span): OtelApi.Span => {
    if (OtelSpanTypeId in span) {
      return (span as OtelSpan).span
    }
    return makeOtelSpan(span, clock)
  })
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
          resource.attributes[OtelSemConv.ATTR_SERVICE_NAME] as string,
          resource.attributes[OtelSemConv.ATTR_SERVICE_VERSION] as string
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
  Layer.provideMerge(layerGlobalTracer)
)

/** @internal */
export const layerWithoutOtelTracer = Layer.unwrapEffect(Effect.map(make, Layer.setTracer))

/** @internal */
export const layer = layerWithoutOtelTracer.pipe(
  Layer.provideMerge(layerTracer)
)

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

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
