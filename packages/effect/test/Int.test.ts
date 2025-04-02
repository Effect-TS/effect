import { describe, it } from "@effect/vitest"
import { Int, pipe } from "effect"

import { assertFalse, assertTrue, strictEqual, throws } from "effect/test/util"

describe("Int", () => {
  it("of", () => {
    const float = 1.5
    const zero = 0

    strictEqual(Int.of(zero), zero)

    throws(() => Int.of(float))
  })

  it("empty", () => {
    strictEqual(Int.empty, 0)
  })

  it("isInt", () => {
    assertTrue(Int.isInt(1))
    assertFalse(Int.isInt(1.5))
    assertFalse(Int.isInt("a"))
    assertFalse(Int.isInt(true))
  })

  it("sum", () => {
    strictEqual(
      pipe(
        Int.of(100),
        Int.sum(Int.of(-50))
      ),
      Int.of(50)
    )

    strictEqual(
      Int.sum(Int.of(-50), Int.of(100)),
      Int.of(50)
    )

    throws(
      // @ts-expect-error - can't pass a float
      () => Int.sum(Int.of(2), 1.5)
    )
  })
})
