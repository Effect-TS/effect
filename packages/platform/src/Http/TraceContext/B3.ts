/**
 * @since 2.0.0
 */
import * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import type * as Tracer from "effect/Tracer"
import { SpanSchema } from "./SpanSchema.js"

/** @internal */
export const header = "b3"

/** @internal */
export const schema = Schema.transformOrFail(
  Schema.struct({
    [header]: Schema.NonEmpty
  }),
  SpanSchema,
  (input, _, ast) => {
    const parts = input.b3.split("-")
    if (parts.length >= 2) {
      return ParseResult.succeed(
        {
          traceId: parts[0],
          spanId: parts[1],
          sampled: parts[2] ? parts[2] === "1" : true,
          parentSpanId: parts[3]
        } as const
      )
    }
    return ParseResult.fail(new ParseResult.Type(ast, input))
  },
  (_) => ParseResult.succeed({ b3: "" } as const)
)

/** @internal */
export const headers = (span: Tracer.Span) => ({
  [header]: `${span.traceId}-${span.spanId}-${span.sampled ? "1" : "0"}${
    span.parent._tag === "Some" ? `-${span.parent.value.spanId}` : ""
  }`
})
