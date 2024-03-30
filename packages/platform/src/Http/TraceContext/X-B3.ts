/**
 * @since 2.0.0
 */
import * as Schema from "@effect/schema/Schema"
import { SpanSchema } from "./SpanSchema.js"

/** @internal */
export const header = "x-b3-traceid"

/** @internal */
export const schema = Schema.transform(
  Schema.struct({
    [header]: Schema.NonEmpty,
    "x-b3-spanid": Schema.NonEmpty,
    "x-b3-parentspanid": Schema.optional(Schema.NonEmpty),
    "x-b3-sampled": Schema.optional(Schema.NonEmpty, { default: () => "1" })
  }),
  SpanSchema,
  (_) => ({
    traceId: _["x-b3-traceid"],
    spanId: _["x-b3-spanid"],
    parentSpanId: _["x-b3-parentspanid"],
    sampled: _["x-b3-sampled"] === "1"
  } as const),
  (_) => ({
    "x-b3-traceid": _.traceId,
    "x-b3-spanid": _.spanId,
    "x-b3-parentspanid": _.parentSpanId,
    "x-b3-sampled": _.sampled ? "1" : "0"
  } as const)
)
