/**
 * @since 1.0.0
 */
import type { Option } from "effect/Option"
import * as Schema from "effect/Schema"

/**
 * @since 1.0.0
 * @category schemas
 */
export const SpanStatusStarted = Schema.Struct({
  _tag: Schema.Literal("Started"),
  startTime: Schema.BigInt
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const SpanStatusEnded = Schema.Struct({
  _tag: Schema.Literal("Ended"),
  startTime: Schema.BigInt,
  endTime: Schema.BigInt
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const SpanStatus = Schema.Union(SpanStatusStarted, SpanStatusEnded)

/**
 * @since 1.0.0
 * @category schemas
 */
export const ExternalSpan = Schema.Struct({
  _tag: Schema.Literal("ExternalSpan"),
  spanId: Schema.String,
  traceId: Schema.String,
  sampled: Schema.Boolean
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
export const Span: Schema.Schema<Span, SpanFrom> = Schema.Struct({
  _tag: Schema.Literal("Span"),
  spanId: Schema.String,
  traceId: Schema.String,
  name: Schema.String,
  sampled: Schema.Boolean,
  attributes: Schema.ReadonlyMap({ key: Schema.String, value: Schema.Unknown }),
  status: SpanStatus,
  parent: Schema.Option(
    Schema.suspend(() => ParentSpan)
      // add a title annotation to avoid "Cannot access 'ParentSpan' before initialization" error during module initialization
      .annotations({ title: "ParentSpan" })
  )
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
> = Schema.Struct({
  _tag: Schema.Literal("SpanEvent"),
  traceId: Schema.String,
  spanId: Schema.String,
  name: Schema.String,
  startTime: Schema.BigInt,
  attributes: Schema.Record({ key: Schema.String, value: Schema.Unknown })
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const ParentSpan = Schema.Union(Span, ExternalSpan)

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
export const Ping = Schema.Struct({
  _tag: Schema.Literal("Ping")
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const Pong = Schema.Struct({
  _tag: Schema.Literal("Pong")
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const MetricsRequest = Schema.Struct({
  _tag: Schema.Literal("MetricsRequest")
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const MetricLabel = Schema.Struct({
  key: Schema.String,
  value: Schema.String
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const metric = <Tag extends string, S, IS, R>(tag: Tag, state: Schema.Schema<S, IS, R>) =>
  Schema.Struct({
    _tag: Schema.Literal(tag),
    name: Schema.String,
    description: Schema.optionalWith(Schema.String, { as: "Option" }),
    tags: Schema.Array(MetricLabel),
    state
  })

/**
 * @since 1.0.0
 * @category schemas
 */
export const Counter = metric(
  "Counter",
  Schema.Struct({
    count: Schema.Union(Schema.Number, Schema.BigInt)
  })
)

/**
 * @since 1.0.0
 * @category schemas
 */
export const Frequency = metric(
  "Frequency",
  Schema.Struct({
    occurrences: Schema.Record({ key: Schema.String, value: Schema.Number })
  })
)

/**
 * @since 1.0.0
 * @category schemas
 */
export const Gauge = metric(
  "Gauge",
  Schema.Struct({
    value: Schema.Union(Schema.Number, Schema.BigInt)
  })
)

const numberOrInfinity = Schema.transform(
  Schema.Union(Schema.Number, Schema.Null),
  Schema.Number,
  {
    strict: true,
    decode: (i) => i === null ? Number.POSITIVE_INFINITY : i,
    encode: (i) => Number.isFinite(i) ? i : null
  }
)

/**
 * @since 1.0.0
 * @category schemas
 */
export const Histogram = metric(
  "Histogram",
  Schema.Struct({
    buckets: Schema.Array(Schema.Tuple(
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
  Schema.Struct({
    error: Schema.Number,
    quantiles: Schema.Array(Schema.Tuple(Schema.Number, Schema.Option(Schema.Number))),
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
export const Metric = Schema.Union(Counter, Frequency, Gauge, Histogram, Summary)

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
export const MetricsSnapshot = Schema.Struct({
  _tag: Schema.Literal("MetricsSnapshot"),
  metrics: Schema.Array(Metric)
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
export const Request = Schema.Union(Ping, Span, SpanEvent, MetricsSnapshot)

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
export const Response = Schema.Union(Pong, MetricsRequest)

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
