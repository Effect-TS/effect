/**
 * @since 2.0.0
 */
import * as Schema from "@effect/schema/Schema"

/** @internal */
export const SpanSchema = Schema.struct({
  traceId: Schema.string,
  spanId: Schema.string,
  parentSpanId: Schema.union(Schema.string, Schema.undefined),
  sampled: Schema.boolean
})
