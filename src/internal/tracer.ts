/**
 * @since 2.0.0
 */
import { Context } from "../exports/Context.js"
import type { Exit } from "../exports/Exit.js"
import { globalValue } from "../exports/GlobalValue.js"
import { MutableRef } from "../exports/MutableRef.js"
import type { Option } from "../exports/Option.js"
import type { Tracer } from "../exports/Tracer.js"

/** @internal */
export const TracerTypeId: Tracer.TracerTypeId = Symbol.for("effect/Tracer") as Tracer.TracerTypeId

/** @internal */
export const make = (options: Omit<Tracer, Tracer.TracerTypeId>): Tracer => ({
  [TracerTypeId]: TracerTypeId,
  ...options
})

/** @internal */
export const tracerTag = Context.Tag<Tracer>(
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
  readonly sampled = true

  status: Tracer.SpanStatus
  attributes: Map<string, unknown>
  events: Array<[name: string, startTime: bigint, attributes: Record<string, unknown>]> = []

  constructor(
    readonly name: string,
    readonly parent: Option<Tracer.ParentSpan>,
    readonly context: Context<never>,
    readonly links: ReadonlyArray<Tracer.SpanLink>,
    readonly startTime: bigint
  ) {
    this.status = {
      _tag: "Started",
      startTime
    }
    this.attributes = new Map()
    this.spanId = `span${MutableRef.incrementAndGet(ids)}`
  }

  end = (endTime: bigint, exit: Exit<unknown, unknown>): void => {
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
export const nativeTracer: Tracer = make({
  span: (name, parent, context, links, startTime) =>
    new NativeSpan(
      name,
      parent,
      context,
      links,
      startTime
    ),
  context: (f) => f()
})

/** @internal */
export const externalSpan = (options: {
  readonly spanId: string
  readonly traceId: string
  readonly sampled?: boolean
  readonly context?: Context<never>
}): Tracer.ExternalSpan => ({
  _tag: "ExternalSpan",
  spanId: options.spanId,
  traceId: options.traceId,
  sampled: options.sampled ?? true,
  context: options.context ?? Context.empty()
})
