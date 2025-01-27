import { Brand, Either, Option } from "effect"
import { assertFalse, assertTrue, deepStrictEqual, strictEqual, throws } from "effect/test/util"
import { describe, it } from "vitest"

declare const IntTypeId: unique symbol
type Int = number & Brand.Brand<typeof IntTypeId>
const Int = Brand.refined<Int>(
  (n) => Number.isInteger(n),
  (n) => Brand.error(`Expected ${n} to be an integer`)
)

type Positive = number & Brand.Brand<"Positive">
const Positive = Brand.refined<Positive>(
  (n) => n > 0,
  (n) => Brand.error(`Expected ${n} to be positive`)
)

type PositiveInt = Positive & Int
const PositiveInt = Brand.all(Int, Positive)

describe("Brand", () => {
  it("nominal", () => {
    type MyNumber = number & Brand.Brand<"MyNumber">
    const MyNumber = Brand.nominal<MyNumber>()
    strictEqual(MyNumber(1), 1)
    strictEqual(MyNumber(1.1), 1.1)
    assertTrue(MyNumber.is(1))
    assertTrue(MyNumber.is(1.1))
  })

  it("refined (predicate overload)", () => {
    strictEqual(Int(1), 1)
    throws(() => Int(1.1))
    deepStrictEqual(Int.option(1), Option.some(1))
    deepStrictEqual(Int.option(1.1), Option.none())
    deepStrictEqual(Int.either(1), Either.right(1 as Int))
    deepStrictEqual(
      Int.either(1.1),
      Either.left(Brand.error("Expected 1.1 to be an integer"))
    )
    assertTrue(Int.is(1))
    assertFalse(Int.is(1.1))
    throws(() => Int(1.1), Brand.error("Expected 1.1 to be an integer"))
  })

  it("refined (Option overload)", () => {
    const Int = Brand.refined<Int>(
      (n) => Number.isInteger(n) ? Option.none() : Option.some(Brand.error(`Expected ${n} to be an integer`))
    )
    throws(() => Int(1.1), Brand.error("Expected 1.1 to be an integer"))
  })

  it("composition", () => {
    strictEqual(PositiveInt(1), 1)
    throws(() => PositiveInt(1.1))
    deepStrictEqual(PositiveInt.option(1), Option.some(1))
    deepStrictEqual(PositiveInt.option(1.1), Option.none())
    deepStrictEqual(PositiveInt.either(1), Either.right(1 as PositiveInt))
    deepStrictEqual(
      PositiveInt.either(1.1),
      Either.left(Brand.error("Expected 1.1 to be an integer"))
    )
    deepStrictEqual(
      PositiveInt.either(-1.1),
      Either.left(Brand.errors(
        Brand.error("Expected -1.1 to be an integer"),
        Brand.error("Expected -1.1 to be positive")
      ))
    )
    assertTrue(PositiveInt.is(1))
    assertFalse(PositiveInt.is(1.1))
  })
})
