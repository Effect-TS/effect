/**
 * This module implements the W3C Trace Context parsing logic
 * according to the spec:
 *
 * https://www.w3.org/TR/trace-context/
 * 
 * @since 2.0.0
 */
import * as Schema from "@effect/schema/Schema"
import type * as Tracer from "effect/Tracer"
import { SpanSchema } from "./SpanSchema.js"

const FLAG_SAMPLED = 0b00000001

const HexString = (bytes: number) =>
  Schema.Lowercase.pipe(
    Schema.length(bytes),
    Schema.pattern(/[^\da-f]+$/)
  )
const Version = <T extends string>(version: T) =>
  HexString(2).pipe(
    Schema.compose(Schema.literal(version), { strict: false })
  )
const TraceId = HexString(32)
const ParentId = HexString(16)
const TraceFlags = HexString(2).pipe(
  // TODO: Padding not preserved on encoding!
  Schema.compose(Schema.NumberFromHex, { strict: false })
)

const Traceparent = Schema.union(
  Schema.split("-").pipe(
    Schema.compose(
      Schema.tuple(
        Version("00"),
        TraceId,
        ParentId,
        TraceFlags
      ),
      { strict: false }
    )
  )
)

/** @internal */
export const header = "traceparent"

/** @internal */
export const schema = Schema.transform(
  Schema.struct({
    [header]: Traceparent
  }),
  SpanSchema,
  ({ traceparent: [version, traceId, parentId, traceFlags] }) => {
    switch (version) {
      case "00":
        return {
          traceId,
          spanId: parentId,
          parentSpanId: undefined,
          sampled: (traceFlags & FLAG_SAMPLED) === FLAG_SAMPLED
        }
    }
  },
  (_) => ({
    traceparent: ["00", _.traceId, _.spanId, _.sampled ? 1 : 0] as const
  })
)

/** @internal */
export const headers = (span: Tracer.Span) => ({
  traceparent: `00-${span.traceId}-${span.spanId}-${span.sampled ? "01" : "00"}`
})
