import { type Effect, hole } from "effect"
import * as Metric from "effect/Metric"
import { describe, expect, it } from "tstyche"

describe("Metric", () => {
  it("isMetric", () => {
    const input = hole<unknown>()
    if (Metric.isMetric(input)) {
      expect(input).type.toBe<Metric.Metric<never, unknown>>()
      expect(Metric.value(input)).type.toBe<Effect.Effect<unknown>>()
    }
  })
})
