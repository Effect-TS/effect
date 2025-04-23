import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import { Ordering } from "effect"

describe("Ordering", () => {
  it("match", () => {
    const f = Ordering.match({
      onLessThan: () => "lt",
      onEqual: () => "eq",
      onGreaterThan: () => "gt"
    })
    strictEqual(f(-1), "lt")
    strictEqual(f(0), "eq")
    strictEqual(f(1), "gt")
  })

  it("reverse", () => {
    strictEqual(Ordering.reverse(-1), 1)
    strictEqual(Ordering.reverse(0), 0)
    strictEqual(Ordering.reverse(1), -1)
  })

  it("combine", () => {
    strictEqual(Ordering.combine(0, 0), 0)
    strictEqual(Ordering.combine(0, 1), 1)
    strictEqual(Ordering.combine(1, -1), 1)
    strictEqual(Ordering.combine(-1, 1), -1)
  })

  it("combineMany", () => {
    strictEqual(Ordering.combineMany(0, []), 0)
    strictEqual(Ordering.combineMany(1, []), 1)
    strictEqual(Ordering.combineMany(-1, []), -1)
    strictEqual(Ordering.combineMany(0, [0, 0, 0]), 0)
    strictEqual(Ordering.combineMany(0, [0, 0, 1]), 1)
    strictEqual(Ordering.combineMany(1, [0, 0, -1]), 1)
    strictEqual(Ordering.combineMany(-1, [0, 0, 1]), -1)
  })
})
