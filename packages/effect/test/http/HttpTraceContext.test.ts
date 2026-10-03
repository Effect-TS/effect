import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import { Option } from "effect"
import { Headers, HttpTraceContext } from "effect/http"

const traceId = "80f198ee56343ba864fe8b2a57d3eff7"
const spanId = "e457b5a2e4d86bd1"

const assertSampled = (headers: Record<string, string>, sampled: boolean) => {
  const span = Option.getOrThrow(HttpTraceContext.fromHeaders(Headers.fromInput(headers)))
  strictEqual(span.traceId, traceId)
  strictEqual(span.spanId, spanId)
  strictEqual(span.sampled, sampled)
}

describe("HttpTraceContext", () => {
  describe("fromHeaders", () => {
    it("accepts single-header B3 debug sampling", () => {
      assertSampled({ b3: `${traceId}-${spanId}-d` }, true)
    })

    it("accepts legacy X-B3-Sampled: true", () => {
      assertSampled({ "X-B3-TraceId": traceId, "X-B3-SpanId": spanId, "X-B3-Sampled": "true" }, true)
    })

    it("lets X-B3-Flags debug override X-B3-Sampled: 0", () => {
      assertSampled({
        "X-B3-TraceId": traceId,
        "X-B3-SpanId": spanId,
        "X-B3-Sampled": "0",
        "X-B3-Flags": "1"
      }, true)
    })

    it("rejects an all-zero W3C trace-id", () => {
      strictEqual(
        Option.isNone(HttpTraceContext.fromHeaders(Headers.fromInput({
          traceparent: `00-${"0".repeat(32)}-${spanId}-01`
        }))),
        true
      )
    })

    it("rejects an all-zero W3C parent-id", () => {
      strictEqual(
        Option.isNone(HttpTraceContext.fromHeaders(Headers.fromInput({
          traceparent: `00-${traceId}-${"0".repeat(16)}-01`
        }))),
        true
      )
    })

    for (const [state, sampled] of [["1", true], ["0", false], [undefined, true]] as const) {
      it(`preserves single-header B3 sampling ${state ?? "when omitted"}`, () => {
        assertSampled({ b3: `${traceId}-${spanId}${state === undefined ? "" : `-${state}`}` }, sampled)
      })
    }

    for (const [state, sampled] of [["1", true], ["0", false], ["false", false], [undefined, true]] as const) {
      it(`preserves multi-header B3 sampling ${state ?? "when omitted"}`, () => {
        assertSampled({
          "X-B3-TraceId": traceId,
          "X-B3-SpanId": spanId,
          ...(state === undefined ? {} : { "X-B3-Sampled": state })
        }, sampled)
      })
    }

    for (const [flags, sampled] of [["01", true], ["00", false]] as const) {
      it(`preserves valid W3C sampling flags ${flags}`, () => {
        assertSampled({ traceparent: `00-${traceId}-${spanId}-${flags}` }, sampled)
      })
    }
  })
})
