import { describe, it } from "@effect/vitest"
import * as Int from "effect/Int"

import { assertFalse, assertNone, assertSome, assertTrue, strictEqual, throws } from "effect/test/util"

describe("Int", () => {
  it("of", () => {
    const float = 1.5
    const zero = 0

    strictEqual(Int.of(zero), zero)

    throws(
      () => Int.of(float)
    )
  })

  it("isInt", () => {
    assertTrue(Int.isInt(1))
    assertFalse(Int.isInt(1.5))
    assertFalse(Int.isInt("a"))
    assertFalse(Int.isInt(true))
  })
})
