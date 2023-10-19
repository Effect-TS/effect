import { deepStrictEqual } from "effect-test/util"
import * as BD from "effect/BigDecimal"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import { describe, it } from "vitest"

const fromString = (s: string) => pipe(BD.fromString(s), Option.getOrThrow)

describe.concurrent("BigDecimal", () => {
  it("sign", () => {
    deepStrictEqual(BD.sign(BD.make(-5n)), -1)
    deepStrictEqual(BD.sign(BD.make(0n)), 0)
    deepStrictEqual(BD.sign(BD.make(5n)), 1)
  })

  it("isBigDecimal", () => {
    deepStrictEqual(BD.isBigDecimal(BD.make(1n)), true)
    deepStrictEqual(BD.isBigDecimal(1), false)
    deepStrictEqual(BD.isBigDecimal(true), false)
  })

  it("equals", () => {
    deepStrictEqual(BD.equals(BD.make(1n), BD.make(1)), true)
    deepStrictEqual(BD.equals(BD.make(1n), BD.make(2n)), false)
    deepStrictEqual(BD.equals(BD.make(1n), BD.make(1.1)), false)
    deepStrictEqual(BD.equals(fromString("0.00012300"), BD.scaled(12300n, 8)), true)
    deepStrictEqual(BD.equals(BD.make(5n), BD.scaled(500n, 2)), true)
    deepStrictEqual(BD.equals(BD.scaled(50000n, 4), BD.scaled(500n, 2)), true)
    deepStrictEqual(BD.equals(BD.scaled(50000n, 4), BD.scaled(500n, 3)), false)
  })

  it("sum", () => {
    deepStrictEqual(BD.sum(BD.make(2n), BD.make(1n)), BD.make(3n))
    deepStrictEqual(BD.sum(BD.scaled(300000n, 5), BD.make(50n)), BD.scaled(5300000n, 5)) // 3.00000 + 50 = 53.00000
    deepStrictEqual(BD.sum(BD.scaled(123n, 2), BD.scaled(45678n, 7)), BD.scaled(12345678n, 7)) // 1.23 + 0.0045678 = 1.2345678
    deepStrictEqual(BD.sum(BD.make(0n), BD.make(0n)), BD.make(0n))
    deepStrictEqual(BD.sum(BD.make(123.456), BD.make(-123.456)), BD.scaled(0n, 3))
  })

  it("multiply", () => {
    deepStrictEqual(BD.multiply(BD.make(3n), BD.make(2n)), BD.make(6n))
    deepStrictEqual(BD.multiply(BD.make(3n), BD.make(0n)), BD.make(0n))
    deepStrictEqual(BD.multiply(BD.make(3n), BD.make(-1n)), BD.make(-3n))
    deepStrictEqual(BD.multiply(BD.make(3n), BD.make(0.5)), BD.make(1.5))
    deepStrictEqual(BD.multiply(BD.make(3n), BD.make(-2.5)), BD.make(-7.5))
  })

  it("subtract", () => {
    deepStrictEqual(BD.subtract(BD.make(3n), BD.make(1n)), BD.make(2n))
    deepStrictEqual(BD.subtract(BD.make(3n), BD.make(0n)), BD.make(3n))
    deepStrictEqual(BD.subtract(BD.make(3n), BD.make(-1n)), BD.make(4n))
    deepStrictEqual(BD.subtract(BD.make(3n), BD.make(0.5)), BD.make(2.5))
    deepStrictEqual(BD.subtract(BD.make(3n), BD.make(-2.5)), BD.make(5.5))
  })

  it("divide", () => {
    const cases = [
      ["0", "1", "0"],
      ["0", "10", "0"],
      ["2", "1", "2"],
      ["20", "1", "20"],
      ["10", "10", "1"],
      ["100", "10.0", "10"],
      ["20.0", "200", "0.1"],
      ["4", "2", "2.0"],
      ["15", "3", "5.0"],
      ["1", "2", "0.5"],
      ["1", "0.02", "50"],
      ["1", "0.2", "5"],
      ["1.0", "0.02", "50"],
      ["1", "0.020", "50"],
      ["5.0", "4.00", "1.25"],
      ["5.0", "4.000", "1.25"],
      ["5", "4.000", "1.25"],
      ["5", "4", "1.25"],
      ["100", "5", "20"],
      ["-50", "5", "-10"],
      ["200", "-5", "-40.0"],
      [
        "1",
        "3",
        "0.3333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333"
      ],
      [
        "-2",
        "-3",
        "0.6666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666667"
      ],
      [
        "-12.34",
        "1.233",
        "-10.00811030008110300081103000811030008110300081103000811030008110300081103000811030008110300081103001"
      ],
      [
        "125348",
        "352.2283",
        "355.8714617763535752237966114591019517738921035021887792661748076460636467881768727839301952739175132"
      ]
    ]

    for (const [x, y, z] of cases) {
      const result = BD.divide(fromString(x), fromString(y)).pipe(Option.getOrThrow)
      const equality = BD.equals(result, fromString(z))
      deepStrictEqual(equality, true)
    }
  })

  it("unsafeDivide", () => {
    deepStrictEqual(BD.unsafeDivide(BD.make(6n), BD.make(2n)), BD.make(3n))
    deepStrictEqual(BD.unsafeDivide(BD.make(6n), BD.make(-2n)), BD.make(-3n))
    deepStrictEqual(BD.unsafeDivide(BD.make(123.456), BD.make(5)), BD.make(24.6912)) // 123.456 / 5 = 24.6912
    deepStrictEqual(BD.unsafeDivide(BD.make(123.456), BD.make(0.2)), BD.make(617.28)) // 123.456 / 0.2 = 617.28
    expect(() => BD.unsafeDivide(BD.make(6n), BD.make(0n))).toThrow("Division by zero")
  })

  it("Equivalence", () => {
    deepStrictEqual(BD.Equivalence(BD.make(1n), BD.make(1n)), true)
    deepStrictEqual(BD.Equivalence(BD.make(1n), BD.make(2n)), false)
    deepStrictEqual(BD.Equivalence(BD.make(1n), BD.make(1.1)), false)
    deepStrictEqual(BD.Equivalence(fromString("0.00012300"), BD.scaled(12300n, 8)), true)
    deepStrictEqual(BD.Equivalence(BD.make(5n), BD.scaled(500n, 2)), true)
  })

  it("Order", () => {
    deepStrictEqual(BD.Order(BD.make(1n), BD.make(2n)), -1)
    deepStrictEqual(BD.Order(BD.make(2n), BD.make(1n)), 1)
    deepStrictEqual(BD.Order(BD.make(2n), BD.make(2n)), 0)
    deepStrictEqual(BD.Order(BD.make(1n), BD.make(1.1)), -1)
    deepStrictEqual(BD.Order(BD.make(1.1), BD.make(1n)), 1)
    deepStrictEqual(BD.Order(fromString("0.00012300"), BD.scaled(12300n, 8)), 0)
    deepStrictEqual(BD.Order(BD.make(5n), BD.scaled(500n, 2)), 0)
    deepStrictEqual(BD.Order(BD.make(5n), BD.scaled(500n, 3)), 1)
    deepStrictEqual(BD.Order(BD.make(5n), BD.scaled(500n, 1)), -1)
  })

  it("lessThan", () => {
    deepStrictEqual(BD.lessThan(BD.make(2n), BD.make(3n)), true)
    deepStrictEqual(BD.lessThan(BD.make(3n), BD.make(3n)), false)
    deepStrictEqual(BD.lessThan(BD.make(4n), BD.make(3n)), false)
  })

  it("lessThanOrEqualTo", () => {
    deepStrictEqual(BD.lessThanOrEqualTo(BD.make(2n), BD.make(3n)), true)
    deepStrictEqual(BD.lessThanOrEqualTo(BD.make(3n), BD.make(3n)), true)
    deepStrictEqual(BD.lessThanOrEqualTo(BD.make(4n), BD.make(3n)), false)
  })

  it("greaterThan", () => {
    deepStrictEqual(BD.greaterThan(BD.make(2n), BD.make(3n)), false)
    deepStrictEqual(BD.greaterThan(BD.make(3n), BD.make(3n)), false)
    deepStrictEqual(BD.greaterThan(BD.make(4n), BD.make(3n)), true)
  })

  it("greaterThanOrEqualTo", () => {
    deepStrictEqual(BD.greaterThanOrEqualTo(BD.make(2n), BD.make(3n)), false)
    deepStrictEqual(BD.greaterThanOrEqualTo(BD.make(3n), BD.make(3n)), true)
    deepStrictEqual(BD.greaterThanOrEqualTo(BD.make(4n), BD.make(3n)), true)
  })

  it("between", () => {
    deepStrictEqual(BD.between(BD.make(0n), BD.make(5n))(BD.make(3n)), true)
    deepStrictEqual(BD.between(BD.make(0n), BD.make(5n))(BD.make(-1n)), false)
    deepStrictEqual(BD.between(BD.make(0n), BD.make(5n))(BD.make(6n)), false)
    deepStrictEqual(BD.between(BD.make(0.02), BD.make(5n))(BD.make(0.0123)), false)
    deepStrictEqual(BD.between(BD.make(0.02), BD.make(5n))(BD.make(0.05)), true)
  })

  it("clamp", () => {
    deepStrictEqual(BD.clamp(BD.make(0n), BD.make(5n))(BD.make(3n)), BD.make(3n))
    deepStrictEqual(BD.clamp(BD.make(0n), BD.make(5n))(BD.make(-1n)), BD.make(0n))
    deepStrictEqual(BD.clamp(BD.make(0n), BD.make(5n))(BD.make(6n)), BD.make(5n))
    deepStrictEqual(BD.clamp(BD.make(0.02), BD.make(5n))(BD.make(0.0123)), BD.make(0.02))
  })

  it("min", () => {
    deepStrictEqual(BD.min(BD.make(2n), BD.make(3n)), BD.make(2n))
    deepStrictEqual(BD.min(BD.make(5n), BD.make(0.1)), BD.make(0.1))
    deepStrictEqual(BD.min(BD.make(0.005), BD.make(3n)), BD.make(0.005))
    deepStrictEqual(BD.min(BD.make(123.456), BD.make(1.2)), BD.make(1.2))
  })

  it("max", () => {
    deepStrictEqual(BD.max(BD.make(2n), BD.make(3n)), BD.make(3n))
    deepStrictEqual(BD.max(BD.make(5n), BD.make(0.1)), BD.make(5n))
    deepStrictEqual(BD.max(BD.make(0.005), BD.make(3n)), BD.make(3n))
    deepStrictEqual(BD.max(BD.make(123.456), BD.make(1.2)), BD.make(123.456))
  })

  it("abs", () => {
    deepStrictEqual(BD.abs(BD.make(2n)), BD.make(2n))
    deepStrictEqual(BD.abs(BD.make(-3n)), BD.make(3n))
    deepStrictEqual(BD.abs(BD.make(0.000456)), BD.make(0.000456))
    deepStrictEqual(BD.abs(BD.make(-0.123)), BD.make(0.123))
  })

  it("negate", () => {
    deepStrictEqual(BD.negate(BD.make(2n)), BD.make(-2n))
    deepStrictEqual(BD.negate(BD.make(-3n)), BD.make(3n))
    deepStrictEqual(BD.negate(BD.make(0.000456)), BD.make(-0.000456))
    deepStrictEqual(BD.negate(BD.make(-0.123)), BD.make(0.123))
  })

  it("remainder", () => {
    deepStrictEqual(BD.remainder(BD.make(5n), BD.make(2n)), Option.some(BD.make(1n)))
    deepStrictEqual(BD.remainder(BD.make(4n), BD.make(2n)), Option.some(BD.make(0n)))
    deepStrictEqual(BD.remainder(BD.make(123.456), BD.make(0.2)), Option.some(BD.make(0.056)))
    deepStrictEqual(BD.remainder(BD.make(5n), BD.make(0n)), Option.none())
  })

  it("unsafeRemainder", () => {
    deepStrictEqual(BD.unsafeRemainder(BD.make(5n), BD.make(2n)), BD.make(1n))
    deepStrictEqual(BD.unsafeRemainder(BD.make(4n), BD.make(2n)), BD.make(0n))
    deepStrictEqual(BD.unsafeRemainder(BD.make(123.456), BD.make(0.2)), BD.make(0.056))
    expect(() => BD.unsafeRemainder(BD.make(5n), BD.make(0n))).toThrow("Division by zero")
  })

  it("normalize", () => {
    deepStrictEqual(BD.normalize(fromString("0.123000")), BD.make(0.123))
    deepStrictEqual(BD.normalize(fromString("123.000")), BD.make(123))
    deepStrictEqual(BD.normalize(fromString("-0.000123000")), BD.make(-0.000123))
    deepStrictEqual(BD.normalize(fromString("-123.000")), BD.make(-123))
    deepStrictEqual(BD.normalize(BD.make(12300000)), BD.scaled(123n, -5))
  })

  it("fromString", () => {
    deepStrictEqual(BD.fromString("2"), Option.some(BD.make(2n)))
    deepStrictEqual(BD.fromString("-2"), Option.some(BD.make(-2n)))
    deepStrictEqual(BD.fromString("0.123"), Option.some(BD.make(0.123)))
    deepStrictEqual(BD.fromString("200"), Option.some(BD.make(200n)))
    deepStrictEqual(BD.fromString("20000000"), Option.some(BD.make(20000000n)))
    deepStrictEqual(BD.fromString("-20000000"), Option.some(BD.make(-20000000n)))
    deepStrictEqual(BD.fromString("2.00"), Option.some(BD.scaled(200n, 2)))
    deepStrictEqual(BD.fromString("0.0000200"), Option.some(BD.scaled(200n, 7)))
    deepStrictEqual(BD.fromString(""), Option.some(BD.make(0n)))
    deepStrictEqual(BD.fromString("1E5"), Option.none())
  })

  it("toString", () => {
    deepStrictEqual(BD.toString(BD.make(2n)), "2")
    deepStrictEqual(BD.toString(BD.make(-2n)), "-2")
    deepStrictEqual(BD.toString(BD.make(0.123)), "0.123")
    deepStrictEqual(BD.toString(BD.make(200n)), "200")
    deepStrictEqual(BD.toString(BD.scaled(200n, -5)), "20000000")
    deepStrictEqual(BD.toString(BD.scaled(-200n, -5)), "-20000000")
    deepStrictEqual(BD.toString(BD.scaled(200n, 2)), "2.00")
    deepStrictEqual(BD.toString(BD.scaled(200n, 3)), "0.200")
    deepStrictEqual(BD.toString(fromString("0.123000")), "0.123000")
    deepStrictEqual(BD.toString(fromString("-456.123")), "-456.123")
  })
})
