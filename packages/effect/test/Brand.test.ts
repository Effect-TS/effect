import * as Brand from "effect/Brand"
import * as Either from "effect/Either"
import * as Option from "effect/Option"
import { assert, describe, it } from "vitest"

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

describe.concurrent("Brand", () => {
  it("nominal", () => {
    type MyNumber = number & Brand.Brand<"MyNumber">
    const MyNumber = Brand.nominal<MyNumber>()
    assert.strictEqual(MyNumber(1), 1)
    assert.strictEqual(MyNumber(1.1), 1.1)
    assert.isTrue(MyNumber.is(1))
    assert.isTrue(MyNumber.is(1.1))
  })

  it("refined", () => {
    assert.strictEqual(Int(1), 1)
    assert.throws(() => Int(1.1))
    assert.deepStrictEqual(Int.option(1), Option.some(1))
    assert.deepStrictEqual(Int.option(1.1), Option.none())
    assert.deepStrictEqual(Int.either(1), Either.right(1 as Int))
    assert.deepStrictEqual(
      Int.either(1.1),
      Either.left(Brand.error("Expected 1.1 to be an integer"))
    )
    assert.isTrue(Int.is(1))
    assert.isFalse(Int.is(1.1))
  })

  it("composition", () => {
    assert.strictEqual(PositiveInt(1), 1)
    assert.throws(() => PositiveInt(1.1))
    assert.deepStrictEqual(PositiveInt.option(1), Option.some(1))
    assert.deepStrictEqual(PositiveInt.option(1.1), Option.none())
    assert.deepStrictEqual(PositiveInt.either(1), Either.right(1 as PositiveInt))
    assert.deepStrictEqual(
      PositiveInt.either(1.1),
      Either.left(Brand.error("Expected 1.1 to be an integer"))
    )
    assert.deepStrictEqual(
      PositiveInt.either(-1.1),
      Either.left(Brand.errors(
        Brand.error("Expected -1.1 to be an integer"),
        Brand.error("Expected -1.1 to be positive")
      ))
    )
    assert.isTrue(PositiveInt.is(1))
    assert.isFalse(PositiveInt.is(1.1))
  })
})
