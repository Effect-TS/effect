import { describe, it } from "@effect/vitest"
import { assertTrue } from "@effect/vitest/utils"
import { DateTime, Option } from "effect"

describe("DateTime instant validation", () => {
  it("rejects invalid object instants", () => {
    assertTrue(Option.isNone(DateTime.make({ epochMilliseconds: NaN })), "NaN should be rejected")
    assertTrue(
      Option.isNone(DateTime.make({ epochMilliseconds: 8_640_000_000_000_001 })),
      "out-of-range instants should be rejected"
    )
  })
})
