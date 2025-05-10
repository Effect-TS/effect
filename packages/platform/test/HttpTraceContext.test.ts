import { Headers } from "@effect/platform"
import * as TraceContext from "@effect/platform/HttpTraceContext"
import { assertNone, assertTrue } from "@effect/vitest/utils"
import { Option } from "effect"
import { describe, it } from "vitest"

describe("HttpTraceContext", () => {
  describe("w3c", () => {
    it("should parse traceIds and spanIds repeatedly", () => {
      const result1 = TraceContext.w3c(Headers.fromInput({
        traceparent: "00-99e04eb3282f5adee84c335ca51626da-886b16145ac0f399-01"
      }))
      const result2 = TraceContext.w3c(Headers.fromInput({
        traceparent: "00-d74bfb8ca565d03f77199ec3c0885d2f-694e4dd0b5ab44cd-01"
      }))

      assertTrue(Option.isSome(result1))
      assertTrue(Option.isSome(result2))
    })

    it("should return none when traceparent header is invalid", () => {
      // Invalid format
      const invalidFormat = TraceContext.w3c(Headers.fromInput({
        traceparent: "0099e04eb3282f5adee84c335ca51626da886b16145ac0f399-01"
      }))
      assertNone(invalidFormat)

      // Invalid version
      const non00Version = TraceContext.w3c(Headers.fromInput({
        traceparent: "01-99e04eb3282f5adee84c335ca51626da-886b16145ac0f399-01"
      }))

      assertNone(non00Version)
      // x included in trace
      const resultTraceNonHex = TraceContext.w3c(Headers.fromInput({
        traceparent: "00-x9e04eb3282f5adee84c335ca51626da-886b16145ac0f399-01"
      }))
      assertNone(resultTraceNonHex)

      // 33 character trace
      const traceLarge = TraceContext.w3c(Headers.fromInput({
        traceparent: "00-99e04eb3282f5adee84c335ca51626daa-886b16145ac0f399-01"
      }))
      assertNone(traceLarge)

      // 31 character trace
      const traceSmall = TraceContext.w3c(Headers.fromInput({
        traceparent: "00-99e04eb3282f5adee84c335ca51626d-886b16145ac0f399-01"
      }))
      assertNone(traceSmall)

      // x included span
      const resultSpanNonHex = TraceContext.w3c(Headers.fromInput({
        traceparent: "00-a9e04eb3282f5adee84c335ca51626da-x86b16145ac0f399-01"
      }))
      assertNone(resultSpanNonHex)

      // 15 characters span
      const spanSmall = TraceContext.w3c(Headers.fromInput({
        traceparent: "00-9e04eb3282f5adee84c335ca51626da-86b16145ac0f399-01"
      }))
      assertNone(spanSmall)

      // 17 characters span
      const spanLarge = TraceContext.w3c(Headers.fromInput({
        traceparent: "00-9e04eb3282f5adee84c335ca51626daaa-86b16145ac0f399-01"
      }))
      assertNone(spanLarge)
    })
  })
})
