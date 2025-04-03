import { describe, it } from "@effect/vitest"
import { Int, Number as _Number, Option, pipe } from "effect"
import {
  assertFalse,
  assertNone,
  assertSome,
  assertTrue,
  notDeepStrictEqual,
  strictEqual,
  throws
} from "effect/test/util"
import * as assert from "node:assert/strict"

describe("Int", () => {
  it("of", () => {
    const float = 1.5
    const zero = 0

    strictEqual(Int.of(zero), zero)
    throws(() => Int.of(float))
    throws(() => Int.of(Number.NaN))
  })

  it("option", () => {
    assertSome(Int.option(0), Int.of(0))
    assertSome(Int.option(Int.empty), Int.empty)
    assertSome(Int.option(-1), Int.of(-1))

    assertNone(Int.option(-1.5))
    assertNone(Int.option(Number.NaN))
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

  it("divide", () => {
    assertSome(pipe(Int.of(6), Int.divide(Int.of(2))), 3)

    notDeepStrictEqual(
      pipe(Int.of(6), Int.divide(Int.of(2))),
      pipe(Int.of(2), Int.divide(Int.of(6))),
      "division under Int is not commutative" // Doha !
    )

    notDeepStrictEqual(
      pipe(
        Int.divide(Int.of(24), Int.of(6)), //
        Option.flatMap((n: number) => _Number.divide(n, Int.of(2)))
      ),
      pipe(
        Int.divide(Int.of(6), Int.of(2)),
        Option.flatMap(_Number.divide(Int.of(24)))
      ),
      "division under Int is not associative" // Doha !
    )

    assertNone(pipe(Int.of(6), Int.divide(Int.of(0))))
  })

  it("unsafeDivide", () => {
    const six = Int.of(6)
    const two = Int.of(2)

    strictEqual(pipe(six, Int.unsafeDivide(two)), Int.unsafeDivide(six, two))

    strictEqual(pipe(six, Int.unsafeDivide(two)), 3)
    strictEqual(pipe(six, Int.unsafeDivide(two)), 3)

    strictEqual(Int.unsafeDivide(Int.empty, six), 0)
    throws(
      () => Int.unsafeDivide(six, Int.empty),
      Int.IntegerDivisionError.divisionByZero(six)
    )
    throws(
      () => Int.unsafeDivide(Int.empty, Int.empty),
      Int.IntegerDivisionError.indeterminateForm()
    )
  })

  it("increment", () => {
    strictEqual(Int.increment(Int.of(1)), Int.of(2))

    strictEqual(Int.increment(Int.of(-99)), Int.of(-98))

    strictEqual(
      pipe(
        Int.of(1),
        Int.increment,
        Int.increment,
        Int.increment,
        Int.increment
      ),
      Int.of(5)
    )
  })

  it("decrement", () => {
    strictEqual(Int.decrement(Int.of(2)), Int.of(1))

    strictEqual(Int.decrement(Int.of(-100)), Int.of(-101))

    strictEqual(
      pipe(
        Int.of(100),
        Int.decrement,
        Int.decrement,
        Int.decrement,
        Int.decrement
      ),
      Int.of(96)
    )
  })

  it("Equivalence", () => {
    assertTrue(Int.Equivalence(Int.of(1), Int.of(1)))
    assertFalse(Int.Equivalence(Int.of(1), Int.of(2)))
  })

  it("Order", () => {
    strictEqual(Int.Order(Int.of(1), Int.of(2)), -1)

    strictEqual(Int.Order(Int.of(-1), Int.of(2)), -1)

    strictEqual(Int.Order(Int.of(-2), Int.of(-1)), -1)

    strictEqual(Int.Order(Int.of(2), Int.of(1)), 1)

    strictEqual(Int.Order(Int.of(2), Int.of(-1)), 1)

    strictEqual(Int.Order(Int.of(-1), Int.of(-2)), 1)

    strictEqual(Int.Order(Int.of(2), Int.of(2)), 0)

    strictEqual(Int.Order(Int.of(-2), Int.of(-2)), 0)
  })
})
