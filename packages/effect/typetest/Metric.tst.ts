import type { Metric } from "effect"
import { describe, expect, it } from "tstyche"

describe("Metric", () => {
  it("exposes its registry type", () => {
    const registry: Metric.MetricRegistry = new Map()

    expect(registry).type.toBe<typeof Metric.MetricRegistry.Service>()
  })
})
