import * as BigInt from "effect/BigInt"
import { describe, it } from "vitest"
import { strictEqual } from "./utils/assert.ts"

describe("BigInt gcd and lcm", () => {
  it("returns a non-negative greatest common divisor", () => {
    strictEqual(BigInt.gcd(-6n, 4n), 2n)
  })

  it("returns a non-negative least common multiple", () => {
    strictEqual(BigInt.lcm(6n, -4n), 12n)
  })

  it("returns zero for two zero operands", () => {
    strictEqual(BigInt.lcm(0n, 0n), 0n)
  })
})
