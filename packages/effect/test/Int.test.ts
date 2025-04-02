import { describe, it } from "@effect/vitest"
import { Int, pipe } from "effect"

import { assertFalse, assertTrue, notDeepStrictEqual, strictEqual, throws } from "effect/test/util"

describe("Int", () => {
  it("of", () => {
    const float = 1.5
    const zero = 0

    strictEqual(Int.of(zero), zero)
    throws(() => Int.of(float))
    throws(() => Int.of(Number.NaN))
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
    strictEqual(pipe(Int.of(100), Int.sum(Int.of(-50))), Int.of(50))
    strictEqual(Int.sum(Int.of(-50), Int.of(100)), Int.of(50))

    strictEqual(
      pipe(Int.of(100), Int.sum(Int.of(-50))),
      pipe(Int.of(-50), Int.sum(Int.of(100))),
      "addition under Int is `commutative`" // Doha !
    )

    strictEqual(
      pipe(Int.of(100), Int.sum(Int.of(-50)), Int.sum(Int.of(-50))),
      pipe(Int.of(-50), Int.sum(Int.of(100)), Int.sum(Int.of(-50))),
      "addition under Int is `associative`" // Doha !
    )

    strictEqual(
      pipe(Int.empty, Int.sum(Int.of(100))),
      Int.of(100),
      "'zeo' is the identity element for addition"
    ) // Doha !

    throws(
      // @ts-expect-error - can't pass a float
      () => Int.sum(Int.of(2), 1.5)
    )
  })

  it("subtract", () => {
    const three = Int.of(3)
    const two = Int.of(2)

    strictEqual(pipe(three, Int.subtract(Int.unit)), two)
    strictEqual(pipe(Int.unit, Int.subtract(three)), -2)

    strictEqual(Int.subtract(three, Int.unit), two)
    strictEqual(Int.subtract(Int.unit, three), -2)

    strictEqual(
      pipe(three, Int.subtract(two)),
      -pipe(two, Int.subtract(three)),
      "subtraction under Int is anticommutative" // Doha !
    )

    notDeepStrictEqual(
      pipe(three, Int.subtract(two), Int.subtract(Int.unit)),
      pipe(two, Int.subtract(three), Int.subtract(Int.unit)),
      "subtraction under Int is not associative" // Doha !
    )

    strictEqual(
      pipe(Int.empty, Int.subtract(three)),
      -three,
      "zero is the identity element under subtraction"
    )
  })

  it("multiply", () => {
    strictEqual(pipe(Int.of(2), Int.multiply(Int.of(3))), 6)
    strictEqual(Int.multiply(Int.of(2), Int.of(3)), 6)

    strictEqual(Int.multiply(Int.of(10), Int.of(-10)), -100)

    strictEqual(
      pipe(Int.of(2), Int.multiply(Int.of(3))),
      pipe(Int.of(3), Int.multiply(Int.of(2))),
      "multiplication under Int is commutative" // Doha !
    )

    strictEqual(
      pipe(Int.of(2), Int.multiply(Int.of(3)), Int.multiply(Int.of(4))),
      pipe(Int.of(2), Int.multiply(Int.of(4)), Int.multiply(Int.of(3))),
      "multiplication under Int is associative" // Doha !
    )

    strictEqual(
      Int.multiply(Int.of(2), Int.unit),
      Int.of(2),
      "`1` is the identity element under multiplication" /* Doha ! */
    )

    strictEqual(
      Int.multiply(Int.of(2), Int.empty),
      Int.empty,
      "multiplication by zero" /* Doha ! */
    )
  })
})
