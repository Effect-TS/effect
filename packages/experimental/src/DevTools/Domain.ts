/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import type { Option } from "effect/Option"

/**
 * @since 1.0.0
 * @category schemas
 */
export const SpanStatusStarted = Schema.struct({
  _tag: Schema.literal("Started"),
  startTime: Schema.bigint
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const SpanStatusEnded = Schema.struct({
  _tag: Schema.literal("Ended"),
  startTime: Schema.bigint,
  endTime: Schema.bigint
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const SpanStatus = Schema.union(SpanStatusStarted, SpanStatusEnded)

/**
 * @since 1.0.0
 * @category schemas
 */
export const ExternalSpan = Schema.struct({
  _tag: Schema.literal("ExternalSpan"),
  spanId: Schema.string,
  traceId: Schema.string,
  sampled: Schema.boolean
})

/**
 * @since 1.0.0
 * @category schemas
 */
export interface ExternalSpanFrom extends Schema.Schema.From<typeof ExternalSpan> {}

/**
 * @since 1.0.0
 * @category schemas
 */
export interface ExternalSpan extends Schema.Schema.To<typeof ExternalSpan> {}

/**
 * @since 1.0.0
 * @category schemas
 */
export const Span: Schema.Schema<SpanFrom, Span> = Schema.struct({
  _tag: Schema.literal("Span"),
  spanId: Schema.string,
  traceId: Schema.string,
  name: Schema.string,
  sampled: Schema.boolean,
  attributes: Schema.readonlyMap(Schema.string, Schema.unknown),
  status: SpanStatus,
  parent: Schema.option(Schema.suspend(() => ParentSpan))
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const ParentSpan = Schema.union(Span, ExternalSpan)

/**
 * @since 1.0.0
 * @category schemas
 */
export type ParentSpanFrom = SpanFrom | ExternalSpanFrom

/**
 * @since 1.0.0
 * @category schemas
 */
export type ParentSpan = Span | ExternalSpan

/**
 * @since 1.0.0
 * @category schemas
 */
export interface SpanFrom {
  readonly _tag: "Span"
  readonly spanId: string
  readonly traceId: string
  readonly name: string
  readonly sampled: boolean
  readonly attributes: ReadonlyArray<readonly [string, unknown]>
  readonly parent: Schema.OptionFrom<ParentSpanFrom>
  readonly status: {
    readonly _tag: "Started"
    readonly startTime: string
  } | {
    readonly _tag: "Ended"
    readonly startTime: string
    readonly endTime: string
  }
}

/**
 * @since 1.0.0
 * @category schemas
 */
export interface Span {
  readonly _tag: "Span"
  readonly spanId: string
  readonly traceId: string
  readonly name: string
  readonly sampled: boolean
  readonly attributes: ReadonlyMap<string, unknown>
  readonly parent: Option<ParentSpan>
  readonly status: {
    readonly _tag: "Started"
    readonly startTime: bigint
  } | {
    readonly _tag: "Ended"
    readonly startTime: bigint
    readonly endTime: bigint
  }
}

/**
 * @since 1.0.0
 * @category schemas
 */
export const Ping = Schema.struct({
  _tag: Schema.literal("Ping")
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const Pong = Schema.struct({
  _tag: Schema.literal("Pong")
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const MetricsRequest = Schema.struct({
  _tag: Schema.literal("MetricsRequest")
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const MetricLabel = Schema.struct({
  key: Schema.string,
  value: Schema.string
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const metric = <Tag extends string, IS, S>(tag: Tag, state: Schema.Schema<IS, S>) =>
  Schema.struct({
    _tag: Schema.literal(tag),
    name: Schema.string,
    description: Schema.optional(Schema.string).toOption(),
    tags: Schema.array(MetricLabel),
    state
  })

/**
 * @since 1.0.0
 * @category schemas
 */
export const Counter = metric(
  "Counter",
  Schema.struct({
    count: Schema.union(Schema.number, Schema.bigint)
  })
)

/**
 * @since 1.0.0
 * @category schemas
 */
export const Frequency = metric(
  "Frequency",
  Schema.struct({
    occurrences: Schema.record(Schema.string, Schema.number)
  })
)

/**
 * @since 1.0.0
 * @category schemas
 */
export const Gauge = metric(
  "Gauge",
  Schema.struct({
    value: Schema.union(Schema.number, Schema.bigint)
  })
)

/**
 * @since 1.0.0
 * @category schemas
 */
export const Histogram = metric(
  "Histogram",
  Schema.struct({
    buckets: Schema.array(Schema.tuple(Schema.number, Schema.number)),
    count: Schema.number,
    min: Schema.number,
    max: Schema.number,
    sum: Schema.number
  })
)

/**
 * @since 1.0.0
 * @category schemas
 */
export const Summary = metric(
  "Summary",
  Schema.struct({
    error: Schema.number,
    quantiles: Schema.array(Schema.tuple(Schema.number, Schema.option(Schema.number))),
    count: Schema.number,
    min: Schema.number,
    max: Schema.number,
    sum: Schema.number
  })
)

/**
 * @since 1.0.0
 * @category schemas
 */
export const Metric = Schema.union(Counter, Frequency, Gauge, Histogram, Summary)

/**
 * @since 1.0.0
 * @category schemas
 */
export type Metric = Schema.Schema.To<typeof Metric>

/**
 * @since 1.0.0
 * @category schemas
 */
export type MetricFrom = Schema.Schema.From<typeof Metric>

/**
 * @since 1.0.0
 * @category schemas
 */
export const MetricsSnapshot = Schema.struct({
  _tag: Schema.literal("MetricsSnapshot"),
  metrics: Schema.array(Metric)
})

/**
 * @since 1.0.0
 * @category schemas
 */
export type MetricsSnapshot = Schema.Schema.To<typeof MetricsSnapshot>

/**
 * @since 1.0.0
 * @category schemas
 */
export type MetricsSnapshotFrom = Schema.Schema.From<typeof MetricsSnapshot>

/**
 * @since 1.0.0
 * @category schemas
 */
export const Request = Schema.union(Ping, Span, MetricsSnapshot)

/**
 * @since 1.0.0
 * @category schemas
 */
export type Request = Schema.Schema.To<typeof Request>

/**
 * @since 1.0.0
 * @category schemas
 */
export declare namespace Request {
  /**
   * @since 1.0.0
   * @category schemas
   */
  export type WithoutPing = Exclude<Request, { readonly _tag: "Ping" }>
}

/**
 * @since 1.0.0
 * @category schemas
 */
export const Response = Schema.union(Pong, MetricsRequest)

/**
 * @since 1.0.0
 * @category schemas
 */
export type Response = Schema.Schema.To<typeof Response>

/**
 * @since 1.0.0
 * @category schemas
 */
export declare namespace Response {
  /**
   * @since 1.0.0
   * @category schemas
   */
  export type WithoutPong = Exclude<Response, { readonly _tag: "Pong" }>
}
