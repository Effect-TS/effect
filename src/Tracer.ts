/**
 * @since 1.0.0
 */
import type * as Context from "./Context"
import type * as Effect from "./Effect"
import type * as Exit from "./Exit"
import type * as Fiber from "./Fiber"
import * as defaultServices from "./internal/defaultServices"
import * as internal from "./internal/tracer"
import type * as Option from "./Option"

/**
 * @since 1.0.0
 */
export const TracerTypeId: unique symbol = internal.TracerTypeId

/**
 * @since 1.0.0
 */
export type TracerTypeId = typeof TracerTypeId

/**
 * @since 1.0.0
 */
export interface Tracer {
  readonly [TracerTypeId]: TracerTypeId
  readonly span: (
    name: string,
    parent: Option.Option<ParentSpan>,
    context: Context.Context<never>,
    links: ReadonlyArray<SpanLink>,
    startTime: bigint
  ) => Span
  readonly context: <X>(f: () => X, fiber: Fiber.RuntimeFiber<any, any>) => X
}

/**
 * @since 1.0.0
 * @category models
 */
export type SpanStatus = {
  _tag: "Started"
  startTime: bigint
} | {
  _tag: "Ended"
  startTime: bigint
  endTime: bigint
  exit: Exit.Exit<unknown, unknown>
}

/**
 * @since 1.0.0
 * @category models
 */
export type ParentSpan = Span | ExternalSpan

/**
 * @since 1.0.0
 * @category models
 */
export interface ExternalSpan {
  readonly _tag: "ExternalSpan"
  readonly spanId: string
  readonly traceId: string
  readonly context: Context.Context<never>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Span {
  readonly _tag: "Span"
  readonly name: string
  readonly spanId: string
  readonly traceId: string
  readonly parent: Option.Option<ParentSpan>
  readonly context: Context.Context<never>
  readonly status: SpanStatus
  readonly attributes: ReadonlyMap<string, AttributeValue>
  readonly links: ReadonlyArray<SpanLink>
  readonly end: (endTime: bigint, exit: Exit.Exit<unknown, unknown>) => void
  readonly attribute: (key: string, value: AttributeValue) => void
  readonly event: (name: string, startTime: bigint, attributes?: Record<string, AttributeValue>) => void
}
/**
 * @since 1.0.0
 * @category models
 */
export type AttributeValue = string | boolean | number

/**
 * @since 1.0.0
 * @category models
 */
export interface SpanLink {
  readonly _tag: "SpanLink"
  readonly span: ParentSpan
  readonly attributes: Readonly<Record<string, AttributeValue>>
}

/**
 * @since 1.0.0
 * @category tags
 */
export const Tracer: Context.Tag<Tracer, Tracer> = internal.tracerTag

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (options: Omit<Tracer, typeof TracerTypeId>) => Tracer = internal.make

/**
 * @since 1.0.0
 * @category constructors
 */
export const tracerWith: <R, E, A>(f: (tracer: Tracer) => Effect.Effect<R, E, A>) => Effect.Effect<R, E, A> =
  defaultServices.tracerWith
