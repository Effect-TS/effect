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
  _tag: Schema.Literal("Started"),
  startTime: Schema.bigint
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const SpanStatusEnded = Schema.struct({
  _tag: Schema.Literal("Ended"),
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
  _tag: Schema.Literal("ExternalSpan"),
  spanId: Schema.String,
  traceId: Schema.String,
  sampled: Schema.boolean
})

/**
 * @since 1.0.0
 * @category schemas
 */
export interface ExternalSpanFrom extends Schema.Schema.Encoded<typeof ExternalSpan> {}

/**
 * @since 1.0.0
 * @category schemas
 */
export interface ExternalSpan extends Schema.Schema.Type<typeof ExternalSpan> {}

/**
 * @since 1.0.0
 * @category schemas
 */
export const Span: Schema.Schema<Span, SpanFrom> = Schema.struct({
  _tag: Schema.Literal("Span"),
  spanId: Schema.String,
  traceId: Schema.String,
  name: Schema.String,
  sampled: Schema.boolean,
  attributes: Schema.readonlyMap({ key: Schema.String, value: Schema.Unknown }),
  status: SpanStatus,
  parent: Schema.option(Schema.suspend(() => ParentSpan))
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const SpanEvent: Schema.Schema<
  SpanEvent,
  {
    readonly _tag: "SpanEvent"
    readonly spanId: string
    readonly traceId: string
    readonly name: string
    readonly attributes: { readonly [x: string]: unknown }
    readonly startTime: string
  }
> = Schema.struct({
  _tag: Schema.Literal("SpanEvent"),
  traceId: Schema.String,
  spanId: Schema.String,
  name: Schema.String,
  startTime: Schema.bigint,
  attributes: Schema.record(Schema.String, Schema.Unknown)
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
  readonly parent: Schema.OptionEncoded<ParentSpanFrom>
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
export interface SpanEvent {
  readonly _tag: "SpanEvent"
  readonly spanId: string
  readonly traceId: string
  readonly name: string
  readonly attributes: { readonly [x: string]: unknown }
  readonly startTime: bigint
}

/**
 * @since 1.0.0
 * @category schemas
 */
export const Ping = Schema.struct({
  _tag: Schema.Literal("Ping")
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const Pong = Schema.struct({
  _tag: Schema.Literal("Pong")
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const MetricsRequest = Schema.struct({
  _tag: Schema.Literal("MetricsRequest")
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const MetricLabel = Schema.struct({
  key: Schema.String,
  value: Schema.String
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const metric = <Tag extends string, S, IS, R>(tag: Tag, state: Schema.Schema<S, IS, R>) =>
  Schema.struct({
    _tag: Schema.Literal(tag),
    name: Schema.String,
    description: Schema.optional(Schema.String, { as: "Option" }),
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
    count: Schema.union(Schema.Number, Schema.bigint)
  })
)

/**
 * @since 1.0.0
 * @category schemas
 */
export const Frequency = metric(
  "Frequency",
  Schema.struct({
    occurrences: Schema.record(Schema.String, Schema.Number)
  })
)

/**
 * @since 1.0.0
 * @category schemas
 */
export const Gauge = metric(
  "Gauge",
  Schema.struct({
    value: Schema.union(Schema.Number, Schema.bigint)
  })
)

const numberOrInfinity = Schema.transform(
  Schema.union(Schema.Number, Schema.Null),
  Schema.Number,
  { decode: (i) => i === null ? Number.POSITIVE_INFINITY : i, encode: (i) => Number.isFinite(i) ? i : null }
)

/**
 * @since 1.0.0
 * @category schemas
 */
export const Histogram = metric(
  "Histogram",
  Schema.struct({
    buckets: Schema.array(Schema.tuple(
      numberOrInfinity,
      Schema.Number
    )),
    count: Schema.Number,
    min: Schema.Number,
    max: Schema.Number,
    sum: Schema.Number
  })
)

/**
 * @since 1.0.0
 * @category schemas
 */
export const Summary = metric(
  "Summary",
  Schema.struct({
    error: Schema.Number,
    quantiles: Schema.array(Schema.tuple(Schema.Number, Schema.option(Schema.Number))),
    count: Schema.Number,
    min: Schema.Number,
    max: Schema.Number,
    sum: Schema.Number
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
export type Metric = Schema.Schema.Type<typeof Metric>

/**
 * @since 1.0.0
 * @category schemas
 */
export type MetricFrom = Schema.Schema.Encoded<typeof Metric>

/**
 * @since 1.0.0
 * @category schemas
 */
export const MetricsSnapshot = Schema.struct({
  _tag: Schema.Literal("MetricsSnapshot"),
  metrics: Schema.array(Metric)
})

/**
 * @since 1.0.0
 * @category schemas
 */
export type MetricsSnapshot = Schema.Schema.Type<typeof MetricsSnapshot>

/**
 * @since 1.0.0
 * @category schemas
 */
export type MetricsSnapshotFrom = Schema.Schema.Encoded<typeof MetricsSnapshot>

/**
 * @since 1.0.0
 * @category schemas
 */
export const Request = Schema.union(Ping, Span, SpanEvent, MetricsSnapshot)

/**
 * @since 1.0.0
 * @category schemas
 */
export type Request = Schema.Schema.Type<typeof Request>

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
export type Response = Schema.Schema.Type<typeof Response>

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
