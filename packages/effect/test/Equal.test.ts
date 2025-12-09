import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import { Equal } from "effect"

describe("Equal", () => {
  it("invalid Date", () => {
    const d1 = new Date("invalid")
    const d2 = new Date("invalid")
    assertTrue(Equal.equals(d1, d2))
  })

  it("Date(0) vs invalid Date", () => {
    const epoch = new Date(0)
    const invalid = new Date("invalid")
    assertFalse(Equal.equals(epoch, invalid))
  })
})
