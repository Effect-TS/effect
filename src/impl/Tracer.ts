/**
 * @since 2.0.0
 */
import type { Context } from "../Context.js"
import type { Effect } from "../Effect.js"
import type { Exit } from "../Exit.js"
import * as defaultServices from "../internal/defaultServices.js"
import * as internal from "../internal/tracer.js"
import type { Option } from "../Option.js"

import type { Tracer } from "../Tracer.js"

/**
 * @since 2.0.0
 */
export const TracerTypeId: unique symbol = internal.TracerTypeId

/**
 * @since 2.0.0
 */
export type TracerTypeId = typeof TracerTypeId

/**
 * @since 2.0.0
 * @category models
 */
export type SpanStatus = {
  _tag: "Started"
  startTime: bigint
} | {
  _tag: "Ended"
  startTime: bigint
  endTime: bigint
  exit: Exit<unknown, unknown>
}

/**
 * @since 2.0.0
 * @category models
 */
export type ParentSpan = Span | ExternalSpan

/**
 * @since 2.0.0
 * @category tags
 */
export const ParentSpan: Context.Tag<ParentSpan, ParentSpan> = internal.spanTag

/**
 * @since 2.0.0
 * @category models
 */
export interface ExternalSpan {
  readonly _tag: "ExternalSpan"
  readonly spanId: string
  readonly traceId: string
  readonly sampled: boolean
  readonly context: Context<never>
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Span {
  readonly _tag: "Span"
  readonly name: string
  readonly spanId: string
  readonly traceId: string
  readonly parent: Option<ParentSpan>
  readonly context: Context<never>
  readonly status: SpanStatus
  readonly attributes: ReadonlyMap<string, unknown>
  readonly links: ReadonlyArray<SpanLink>
  readonly sampled: boolean
  readonly end: (endTime: bigint, exit: Exit<unknown, unknown>) => void
  readonly attribute: (key: string, value: unknown) => void
  readonly event: (name: string, startTime: bigint, attributes?: Record<string, unknown>) => void
}

/**
 * @since 2.0.0
 * @category models
 */
export interface SpanLink {
  readonly _tag: "SpanLink"
  readonly span: ParentSpan
  readonly attributes: Readonly<Record<string, unknown>>
}

/**
 * @since 2.0.0
 * @category tags
 */
export const Tag: Context.Tag<Tracer, Tracer> = internal.tracerTag

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: (options: Omit<Tracer, typeof TracerTypeId>) => Tracer = internal.make

/**
 * @since 2.0.0
 * @category constructors
 */
export const externalSpan: (options: {
  readonly spanId: string
  readonly traceId: string
  readonly sampled?: boolean | undefined
  readonly context?: Context<never> | undefined
}) => ExternalSpan = internal.externalSpan

/**
 * @since 2.0.0
 * @category constructors
 */
export const tracerWith: <R, E, A>(f: (tracer: Tracer) => Effect<R, E, A>) => Effect<R, E, A> =
  defaultServices.tracerWith
