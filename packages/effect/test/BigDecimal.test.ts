import { BigDecimal, Equal, FastCheck as fc, Option } from "effect"
import { assertFalse, assertTrue, deepStrictEqual, equals, strictEqual, throws } from "effect/test/util"
import { describe, it } from "vitest"

const $ = BigDecimal.unsafeFromString

describe("BigDecimal", () => {
  it("isBigDecimal", () => {
    assertTrue(BigDecimal.isBigDecimal($("0")))
    assertTrue(BigDecimal.isBigDecimal($("987")))
    assertTrue(BigDecimal.isBigDecimal($("123.0")))
    assertTrue(BigDecimal.isBigDecimal($("0.123")))
    assertTrue(BigDecimal.isBigDecimal($("123.456")))
    assertFalse(BigDecimal.isBigDecimal("1"))
    assertFalse(BigDecimal.isBigDecimal(true))
  })

  it("sign", () => {
    deepStrictEqual(BigDecimal.sign($("-5")), -1)
    deepStrictEqual(BigDecimal.sign($("0")), 0)
    deepStrictEqual(BigDecimal.sign($("5")), 1)
    deepStrictEqual(BigDecimal.sign($("-123.456")), -1)
    deepStrictEqual(BigDecimal.sign($("456.789")), 1)
  })

  it("equals", () => {
    assertTrue(BigDecimal.equals($("1"), $("1")))
    assertTrue(BigDecimal.equals($("0.00012300"), $("0.000123")))
    assertTrue(BigDecimal.equals($("5"), $("5.0")))
    assertTrue(BigDecimal.equals($("123.0000"), $("123.00")))
    assertFalse(BigDecimal.equals($("1"), $("2")))
    assertFalse(BigDecimal.equals($("1"), $("1.1")))
    assertFalse(BigDecimal.equals($("1"), $("0.1")))
  })

  it("sum", () => {
    equals(BigDecimal.sum($("2"), $("0")), $("2"))
    equals(BigDecimal.sum($("0"), $("2")), $("2"))
    equals(BigDecimal.sum($("0"), $("0")), $("0"))
    equals(BigDecimal.sum($("2"), $("1")), $("3"))
    equals(BigDecimal.sum($("3.00000"), $("50")), $("53"))
    equals(BigDecimal.sum($("1.23"), $("0.0045678")), $("1.2345678"))
    equals(BigDecimal.sum($("123.456"), $("-123.456")), $("0"))
  })

  it("multiply", () => {
    equals(BigDecimal.multiply($("3"), $("2")), $("6"))
    equals(BigDecimal.multiply($("3"), $("0")), $("0"))
    equals(BigDecimal.multiply($("3"), $("-1")), $("-3"))
    equals(BigDecimal.multiply($("3"), $("0.5")), $("1.5"))
    equals(BigDecimal.multiply($("3"), $("-2.5")), $("-7.5"))
  })

  it("subtract", () => {
    equals(BigDecimal.subtract($("0"), $("1")), $("-1"))
    equals(BigDecimal.subtract($("2.1"), $("1")), $("1.1"))
    equals(BigDecimal.subtract($("3"), $("1")), $("2"))
    equals(BigDecimal.subtract($("3"), $("0")), $("3"))
    equals(BigDecimal.subtract($("3"), $("-1")), $("4"))
    equals(BigDecimal.subtract($("3"), $("0.5")), $("2.5"))
    equals(BigDecimal.subtract($("3"), $("-2.5")), $("5.5"))
  })

  it("roundTerminal", () => {
    strictEqual(BigDecimal.roundTerminal(0n), 0n)
    strictEqual(BigDecimal.roundTerminal(4n), 0n)
    strictEqual(BigDecimal.roundTerminal(5n), 1n)
    strictEqual(BigDecimal.roundTerminal(9n), 1n)
    strictEqual(BigDecimal.roundTerminal(49n), 0n)
    strictEqual(BigDecimal.roundTerminal(59n), 1n)
    strictEqual(BigDecimal.roundTerminal(99n), 1n)
    strictEqual(BigDecimal.roundTerminal(-4n), 0n)
    strictEqual(BigDecimal.roundTerminal(-5n), 1n)
    strictEqual(BigDecimal.roundTerminal(-9n), 1n)
    strictEqual(BigDecimal.roundTerminal(-49n), 0n)
    strictEqual(BigDecimal.roundTerminal(-59n), 1n)
    strictEqual(BigDecimal.roundTerminal(-99n), 1n)
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
      equals(BigDecimal.divide($(x), $(y)).pipe(Option.getOrThrow), $(z))
      equals(BigDecimal.unsafeDivide($(x), $(y)), $(z))
    }

    assertTrue(Option.isNone(BigDecimal.divide($("5"), $("0"))))
    throws(() => BigDecimal.unsafeDivide($("5"), $("0")), "Division by zero")
  })

  it("Equivalence", () => {
    assertTrue(BigDecimal.Equivalence($("1"), $("1")))
    assertTrue(BigDecimal.Equivalence($("0.00012300"), $("0.000123")))
    assertTrue(BigDecimal.Equivalence($("5"), $("5.00")))
    assertFalse(BigDecimal.Equivalence($("1"), $("2")))
    assertFalse(BigDecimal.Equivalence($("1"), $("1.1")))
  })

  it("Order", () => {
    deepStrictEqual(BigDecimal.Order($("1"), $("2")), -1)
    deepStrictEqual(BigDecimal.Order($("2"), $("1")), 1)
    deepStrictEqual(BigDecimal.Order($("2"), $("2")), 0)
    deepStrictEqual(BigDecimal.Order($("1"), $("1.1")), -1)
    deepStrictEqual(BigDecimal.Order($("1.1"), $("1")), 1)
    deepStrictEqual(BigDecimal.Order($("0.00012300"), $("0.000123")), 0)
    deepStrictEqual(BigDecimal.Order($("5"), $("5.000")), 0)
    deepStrictEqual(BigDecimal.Order($("5"), $("0.500")), 1)
    deepStrictEqual(BigDecimal.Order($("5"), $("50.00")), -1)
  })

  it("lessThan", () => {
    assertTrue(BigDecimal.lessThan($("2"), $("3")))
    assertFalse(BigDecimal.lessThan($("3"), $("3")))
    assertFalse(BigDecimal.lessThan($("4"), $("3")))
  })

  it("lessThanOrEqualTo", () => {
    assertTrue(BigDecimal.lessThanOrEqualTo($("2"), $("3")))
    assertTrue(BigDecimal.lessThanOrEqualTo($("3"), $("3")))
    assertFalse(BigDecimal.lessThanOrEqualTo($("4"), $("3")))
  })

  it("greaterThan", () => {
    assertFalse(BigDecimal.greaterThan($("2"), $("3")))
    assertFalse(BigDecimal.greaterThan($("3"), $("3")))
    assertTrue(BigDecimal.greaterThan($("4"), $("3")))
  })

  it("greaterThanOrEqualTo", () => {
    deepStrictEqual(BigDecimal.greaterThanOrEqualTo($("2"), $("3")), false)
    deepStrictEqual(BigDecimal.greaterThanOrEqualTo($("3"), $("3")), true)
    deepStrictEqual(BigDecimal.greaterThanOrEqualTo($("4"), $("3")), true)
  })

  it("between", () => {
    deepStrictEqual(BigDecimal.between({ minimum: $("0"), maximum: $("5") })($("3")), true)
    deepStrictEqual(BigDecimal.between({ minimum: $("0"), maximum: $("5") })($("-1")), false)
    deepStrictEqual(BigDecimal.between({ minimum: $("0"), maximum: $("5") })($("6")), false)
    deepStrictEqual(BigDecimal.between({ minimum: $("0.02"), maximum: $("5") })($("0.0123")), false)
    deepStrictEqual(BigDecimal.between({ minimum: $("0.02"), maximum: $("5") })($("0.05")), true)

    deepStrictEqual(BigDecimal.between($("3"), { minimum: $("0"), maximum: $("5") }), true)
  })

  it("clamp", () => {
    equals(BigDecimal.clamp({ minimum: $("0"), maximum: $("5") })($("3")), $("3"))
    equals(BigDecimal.clamp({ minimum: $("0"), maximum: $("5") })($("-1")), $("0"))
    equals(BigDecimal.clamp({ minimum: $("0"), maximum: $("5") })($("6")), $("5"))
    equals(BigDecimal.clamp({ minimum: $("0.02"), maximum: $("5") })($("0.0123")), $("0.02"))

    equals(BigDecimal.clamp($("3"), { minimum: $("0"), maximum: $("5") }), $("3"))
  })

  it("min", () => {
    equals(BigDecimal.min($("2"), $("3")), $("2"))
    equals(BigDecimal.min($("5"), $("0.1")), $("0.1"))
    equals(BigDecimal.min($("0.005"), $("3")), $("0.005"))
    equals(BigDecimal.min($("123.456"), $("1.2")), $("1.2"))
  })

  it("max", () => {
    equals(BigDecimal.max($("2"), $("3")), $("3"))
    equals(BigDecimal.max($("5"), $("0.1")), $("5"))
    equals(BigDecimal.max($("0.005"), $("3")), $("3"))
    equals(BigDecimal.max($("123.456"), $("1.2")), $("123.456"))
  })

  it("abs", () => {
    equals(BigDecimal.abs($("2")), $("2"))
    equals(BigDecimal.abs($("-3")), $("3"))
    equals(BigDecimal.abs($("0.000456")), $("0.000456"))
    equals(BigDecimal.abs($("-0.123")), $("0.123"))
  })

  it("negate", () => {
    equals(BigDecimal.negate($("2")), $("-2"))
    equals(BigDecimal.negate($("-3")), $("3"))
    equals(BigDecimal.negate($("0.000456")), $("-0.000456"))
    equals(BigDecimal.negate($("-0.123")), $("0.123"))
  })

  it("remainder", () => {
    equals(BigDecimal.remainder($("5"), $("2")).pipe(Option.getOrThrow), $("1"))
    equals(BigDecimal.remainder($("4"), $("2")).pipe(Option.getOrThrow), $("0"))
    equals(BigDecimal.remainder($("123.456"), $("0.2")).pipe(Option.getOrThrow), $("0.056"))
    assertTrue(Option.isNone(BigDecimal.remainder($("5"), $("0"))))
  })

  it("unsafeRemainder", () => {
    equals(BigDecimal.unsafeRemainder($("5"), $("2")), $("1"))
    equals(BigDecimal.unsafeRemainder($("4"), $("2")), $("0"))
    equals(BigDecimal.unsafeRemainder($("123.456"), $("0.2")), $("0.056"))
    throws(() => BigDecimal.unsafeRemainder($("5"), $("0")), "Division by zero")
  })

  it("normalize", () => {
    deepStrictEqual(BigDecimal.normalize($("0")), BigDecimal.unsafeMakeNormalized(0n, 0))
    deepStrictEqual(BigDecimal.normalize($("0.123000")), BigDecimal.unsafeMakeNormalized(123n, 3))
    deepStrictEqual(BigDecimal.normalize($("123.000")), BigDecimal.unsafeMakeNormalized(123n, 0))
    deepStrictEqual(BigDecimal.normalize($("-0.000123000")), BigDecimal.unsafeMakeNormalized(-123n, 6))
    deepStrictEqual(BigDecimal.normalize($("-123.000")), BigDecimal.unsafeMakeNormalized(-123n, 0))
    deepStrictEqual(BigDecimal.normalize($("12300000")), BigDecimal.unsafeMakeNormalized(123n, -5))
  })

  it("fromString", () => {
    deepStrictEqual(BigDecimal.fromString("2"), Option.some(BigDecimal.make(2n, 0)))
    deepStrictEqual(BigDecimal.fromString("-2"), Option.some(BigDecimal.make(-2n, 0)))
    deepStrictEqual(BigDecimal.fromString("0.123"), Option.some(BigDecimal.make(123n, 3)))
    deepStrictEqual(BigDecimal.fromString("200"), Option.some(BigDecimal.make(200n, 0)))
    deepStrictEqual(BigDecimal.fromString("20000000"), Option.some(BigDecimal.make(20000000n, 0)))
    deepStrictEqual(BigDecimal.fromString("-20000000"), Option.some(BigDecimal.make(-20000000n, 0)))
    deepStrictEqual(BigDecimal.fromString("2.00"), Option.some(BigDecimal.make(200n, 2)))
    deepStrictEqual(BigDecimal.fromString("0.0000200"), Option.some(BigDecimal.make(200n, 7)))
    deepStrictEqual(BigDecimal.fromString(""), Option.some(BigDecimal.normalize(BigDecimal.make(0n, 0))))
    deepStrictEqual(BigDecimal.fromString("1e5"), Option.some(BigDecimal.make(1n, -5)))
    deepStrictEqual(BigDecimal.fromString("1E15"), Option.some(BigDecimal.make(1n, -15)))
    deepStrictEqual(BigDecimal.fromString("1e+5"), Option.some(BigDecimal.make(1n, -5)))
    deepStrictEqual(BigDecimal.fromString("1E+15"), Option.some(BigDecimal.make(1n, -15)))
    deepStrictEqual(BigDecimal.fromString("-1.5E3"), Option.some(BigDecimal.make(-15n, -2)))
    deepStrictEqual(BigDecimal.fromString("-1.5e3"), Option.some(BigDecimal.make(-15n, -2)))
    deepStrictEqual(BigDecimal.fromString("-.5e3"), Option.some(BigDecimal.make(-5n, -2)))
    deepStrictEqual(BigDecimal.fromString("-5e3"), Option.some(BigDecimal.make(-5n, -3)))
    deepStrictEqual(BigDecimal.fromString("-5e-3"), Option.some(BigDecimal.make(-5n, 3)))
    deepStrictEqual(BigDecimal.fromString("15e-3"), Option.some(BigDecimal.make(15n, 3)))
    deepStrictEqual(BigDecimal.fromString("0.00002e5"), Option.some(BigDecimal.make(2n, 0)))
    deepStrictEqual(BigDecimal.fromString("0.00002e-5"), Option.some(BigDecimal.make(2n, 10)))
    assertTrue(Option.isNone(BigDecimal.fromString("0.0000e2e1")))
    assertTrue(Option.isNone(BigDecimal.fromString("0.1.2")))
  })

  it("format", () => {
    strictEqual(BigDecimal.format($("2")), "2")
    strictEqual(BigDecimal.format($("-2")), "-2")
    strictEqual(BigDecimal.format($("0.123")), "0.123")
    strictEqual(BigDecimal.format($("200")), "200")
    strictEqual(BigDecimal.format($("20000000")), "20000000")
    strictEqual(BigDecimal.format($("-20000000")), "-20000000")
    strictEqual(BigDecimal.format($("2.00")), "2")
    strictEqual(BigDecimal.format($("0.200")), "0.2")
    strictEqual(BigDecimal.format($("0.123000")), "0.123")
    strictEqual(BigDecimal.format($("-456.123")), "-456.123")
    strictEqual(BigDecimal.format(BigDecimal.make(10n, -1)), "100")
    strictEqual(BigDecimal.format(BigDecimal.make(1n, -25)), "1e+25")
    strictEqual(BigDecimal.format(BigDecimal.make(12345n, -25)), "1.2345e+29")
    strictEqual(BigDecimal.format(BigDecimal.make(12345n, 25)), "1.2345e-21")
    strictEqual(BigDecimal.format(BigDecimal.make(-12345n, 20)), "-1.2345e-16")
  })

  it("toJSON()", () => {
    deepStrictEqual(JSON.stringify($("2")), JSON.stringify({ _id: "BigDecimal", value: "2", scale: 0 }))
  })

  it("inspect", () => {
    if (typeof window === "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { inspect } = require("node:util")
      deepStrictEqual(inspect($("2")), inspect({ _id: "BigDecimal", value: "2", scale: 0 }))
    }
  })

  it("toString()", () => {
    strictEqual(String($("2")), "BigDecimal(2)")
  })

  it("Equal.symbol", () => {
    assertTrue(Equal.equals($("2"), $("2")))
  })

  it("pipe()", () => {
    deepStrictEqual($("2").pipe(BigDecimal.multiply($("3"))), $("6"))
  })

  it("scale", () => {
    deepStrictEqual(BigDecimal.scale($("3.0005"), 3), $("3.000"))
  })

  it("fromBigInt", () => {
    deepStrictEqual(BigDecimal.fromBigInt(1n), BigDecimal.make(1n, 0))
  })

  it("fromNumber", () => {
    deepStrictEqual(BigDecimal.fromNumber(123), BigDecimal.make(123n, 0))
    deepStrictEqual(BigDecimal.fromNumber(123.456), BigDecimal.make(123456n, 3))
  })

  it("unsafeToNumber", () => {
    strictEqual(BigDecimal.unsafeToNumber($("123.456")), 123.456)
  })

  it("isInteger", () => {
    assertTrue(BigDecimal.isInteger($("0")))
    assertTrue(BigDecimal.isInteger($("1")))
    assertFalse(BigDecimal.isInteger($("1.1")))
  })

  it("isZero", () => {
    assertTrue(BigDecimal.isZero($("0")))
    assertFalse(BigDecimal.isZero($("1")))
  })

  it("isNegative", () => {
    assertTrue(BigDecimal.isNegative($("-1")))
    assertFalse(BigDecimal.isNegative($("0")))
    assertFalse(BigDecimal.isNegative($("1")))
  })

  it("isPositive", () => {
    assertFalse(BigDecimal.isPositive($("-1")))
    assertFalse(BigDecimal.isPositive($("0")))
    assertTrue(BigDecimal.isPositive($("1")))
  })
})

// This test is skipped because it is slow. It remains here as an opt-in test for
// debugging or active development of features in the `BigDecimal` module.
describe.skip("Property based testing", () => {
  const zeroArb = fc.constant(BigDecimal.unsafeMakeNormalized(0n, 0))
  const bigDecimalArb = fc.tuple(fc.bigInt(), fc.integer()).map(([value, scale]) => BigDecimal.make(value, scale))
  const arbWithZero = fc.oneof({ arbitrary: zeroArb, weight: 1 }, { arbitrary: bigDecimalArb, weight: 3 })

  it("unsafeFromString and format should be inverses", () => {
    fc.assert(fc.property(arbWithZero, (bd) => {
      return BigDecimal.equals(BigDecimal.unsafeFromString(BigDecimal.format(bd)), bd)
    }))
  })

  it("toExponential should harmonize with Number.prototype.toExponential", () => {
    const actualNumbers = fc.float().filter((n) => Number.isFinite(n))
    fc.assert(fc.property(actualNumbers, (n) => {
      return n.toExponential() === BigDecimal.toExponential(BigDecimal.unsafeFromNumber(n))
    }))
  })
})
