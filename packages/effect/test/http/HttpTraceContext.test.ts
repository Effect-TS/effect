import { assert, describe, it } from "@effect/vitest"
import * as Headers from "effect/http/Headers"
import * as HttpTraceContext from "effect/http/HttpTraceContext"
import * as Option from "effect/Option"

const traceId = "80f198ee56343ba864fe8b2a57d3eff7"
const spanId = "e457b5a2e4d86bd1"

const sampled = (parse: HttpTraceContext.FromHeaders, headers: Record<string, string>) =>
  Option.map(parse(Headers.fromInput(headers)), (span) => span.sampled)

describe("HttpTraceContext", () => {
  describe("b3", () => {
    it("reads the sampling state", () => {
      assert.deepStrictEqual(sampled(HttpTraceContext.b3, { b3: `${traceId}-${spanId}-1` }), Option.some(true))
      assert.deepStrictEqual(sampled(HttpTraceContext.b3, { b3: `${traceId}-${spanId}-0` }), Option.some(false))
      assert.deepStrictEqual(sampled(HttpTraceContext.b3, { b3: `${traceId}-${spanId}` }), Option.some(true))
    })

    it("treats the debug sampling state as sampled", () => {
      assert.deepStrictEqual(sampled(HttpTraceContext.b3, { b3: `${traceId}-${spanId}-d` }), Option.some(true))
    })
  })

  describe("xb3", () => {
    const ids = { "x-b3-traceid": traceId, "x-b3-spanid": spanId }

    it("reads x-b3-sampled", () => {
      assert.deepStrictEqual(sampled(HttpTraceContext.xb3, { ...ids, "x-b3-sampled": "1" }), Option.some(true))
      assert.deepStrictEqual(sampled(HttpTraceContext.xb3, { ...ids, "x-b3-sampled": "0" }), Option.some(false))
      assert.deepStrictEqual(sampled(HttpTraceContext.xb3, ids), Option.some(true))
    })

    it("accepts the legacy true and false values of x-b3-sampled", () => {
      assert.deepStrictEqual(sampled(HttpTraceContext.xb3, { ...ids, "x-b3-sampled": "true" }), Option.some(true))
      assert.deepStrictEqual(sampled(HttpTraceContext.xb3, { ...ids, "x-b3-sampled": "false" }), Option.some(false))
    })

    it("treats the debug flag as sampled", () => {
      assert.deepStrictEqual(sampled(HttpTraceContext.xb3, { ...ids, "x-b3-flags": "1" }), Option.some(true))
      assert.deepStrictEqual(
        sampled(HttpTraceContext.xb3, { ...ids, "x-b3-sampled": "0", "x-b3-flags": "1" }),
        Option.some(true)
      )
    })
  })

  describe("w3c", () => {
    it("reads the sampled flag", () => {
      assert.deepStrictEqual(
        sampled(HttpTraceContext.w3c, { traceparent: `00-${traceId}-${spanId}-01` }),
        Option.some(true)
      )
      assert.deepStrictEqual(
        sampled(HttpTraceContext.w3c, { traceparent: `00-${traceId}-${spanId}-00` }),
        Option.some(false)
      )
    })

    it("rejects an all-zero trace-id", () => {
      assert.deepStrictEqual(
        HttpTraceContext.w3c(Headers.fromInput({ traceparent: `00-${"0".repeat(32)}-${spanId}-01` })),
        Option.none()
      )
    })

    it("rejects an all-zero parent-id", () => {
      assert.deepStrictEqual(
        HttpTraceContext.w3c(Headers.fromInput({ traceparent: `00-${traceId}-${"0".repeat(16)}-01` })),
        Option.none()
      )
    })
  })

  describe("fromHeaders", () => {
    it("falls back to b3 when traceparent is invalid", () => {
      const span = HttpTraceContext.fromHeaders(Headers.fromInput({
        traceparent: `00-${"0".repeat(32)}-${spanId}-01`,
        b3: `${traceId}-${spanId}-1`
      }))
      assert.deepStrictEqual(Option.map(span, (span) => span.traceId), Option.some(traceId))
    })
  })
})
