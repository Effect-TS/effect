/**
 * @since 2.0.0
 */
import * as Context from "../Context"
import type * as Exit from "../Exit"
import { globalValue } from "../GlobalValue"
import * as MutableRef from "../MutableRef"
import type * as Option from "../Option"
import type * as Tracer from "../Tracer"

/** @internal */
export const TracerTypeId: Tracer.TracerTypeId = Symbol.for("effect/Tracer") as Tracer.TracerTypeId

/** @internal */
export const make = (options: Omit<Tracer.Tracer, Tracer.TracerTypeId>): Tracer.Tracer => ({
  [TracerTypeId]: TracerTypeId,
  ...options
})

/** @internal */
export const tracerTag = Context.Tag<Tracer.Tracer>(
  Symbol.for("effect/Tracer")
)

/** @internal */
export const spanTag = Context.Tag<Tracer.ParentSpan>(
  Symbol.for("effect/ParentSpan")
)

const ids = globalValue("effect/Tracer/SpanId.ids", () => MutableRef.make(0))

/** @internal */
export class NativeSpan implements Tracer.Span {
  readonly _tag = "Span"
  readonly spanId: string
  readonly traceId: string = "native"

  status: Tracer.SpanStatus
  attributes: Map<string, unknown>
  events: Array<[name: string, startTime: bigint, attributes: Record<string, unknown>]> = []

  constructor(
    readonly name: string,
    readonly parent: Option.Option<Tracer.ParentSpan>,
    readonly context: Context.Context<never>,
    readonly links: ReadonlyArray<Tracer.SpanLink>,
    readonly sampled: boolean,
    readonly startTime: bigint
  ) {
    this.status = {
      _tag: "Started",
      startTime
    }
    this.attributes = new Map()
    this.spanId = `span${MutableRef.incrementAndGet(ids)}`
  }

  end = (endTime: bigint, exit: Exit.Exit<unknown, unknown>): void => {
    this.status = {
      _tag: "Ended",
      endTime,
      exit,
      startTime: this.status.startTime
    }
  }

  attribute = (key: string, value: unknown): void => {
    this.attributes.set(key, value)
  }

  event = (name: string, startTime: bigint, attributes?: Record<string, unknown>): void => {
    this.events.push([name, startTime, attributes ?? {}])
  }
}

/** @internal */
export const nativeTracer: Tracer.Tracer = make({
  span: (name, parent, context, links, sampled, startTime) =>
    new NativeSpan(
      name,
      parent,
      context,
      links,
      sampled,
      startTime
    ),
  context: (f) => f()
})

/** @internal */
export const externalSpan = (options: {
  readonly spanId: string
  readonly traceId: string
  readonly sampled?: boolean
  readonly context?: Context.Context<never>
}): Tracer.ExternalSpan => ({
  _tag: "ExternalSpan",
  spanId: options.spanId,
  traceId: options.traceId,
  sampled: options.sampled ?? true,
  context: options.context ?? Context.empty()
})
