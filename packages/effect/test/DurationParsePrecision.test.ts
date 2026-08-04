import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import { Duration } from "effect"

describe("Duration decimal parsing", () => {
  it("preserves integer precision before rounding nanos", () => {
    strictEqual(
      Duration.toNanosUnsafe(Duration.fromInputUnsafe("9007199254740993.1 nanos")),
      9_007_199_254_740_993n,
      "decimal nanos should be rounded without first losing integer precision"
    )
  })
})
