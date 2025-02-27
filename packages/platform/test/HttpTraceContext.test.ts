import { Headers } from "@effect/platform"
import * as TraceContext from "@effect/platform/HttpTraceContext"
import { Option } from "effect"
import { describe, expect, it } from "vitest"

describe("HttpTraceContext", () => {
  describe("w3c", () => {
    it("should parse traceIds and spanIds repeatedly", () => {
      const result1 = TraceContext.w3c(Headers.fromInput({
        traceparent: "00-99e04eb3282f5adee84c335ca51626da-886b16145ac0f399-01"
      }))
      const result2 = TraceContext.w3c(Headers.fromInput({
        traceparent: "00-d74bfb8ca565d03f77199ec3c0885d2f-694e4dd0b5ab44cd-01"
      }))

      expect(Option.isSome(result1)).toBe(true)
      expect(Option.isSome(result2)).toBe(true)
    })
  })
})
