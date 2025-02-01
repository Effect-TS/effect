import { describe, it } from "@effect/vitest"
import { BigDecimal, Equal, FastCheck as fc, Option } from "effect"
import {
  assertEquals,
  assertFalse,
  assertNone,
  assertSome,
  assertTrue,
  deepStrictEqual,
  strictEqual,
  throws
} from "effect/test/util"

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
    strictEqual(BigDecimal.sign($("-5")), -1)
    strictEqual(BigDecimal.sign($("0")), 0)
    strictEqual(BigDecimal.sign($("5")), 1)
    strictEqual(BigDecimal.sign($("-123.456")), -1)
    strictEqual(BigDecimal.sign($("456.789")), 1)
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
    assertEquals(BigDecimal.sum($("2"), $("0")), $("2"))
    assertEquals(BigDecimal.sum($("0"), $("2")), $("2"))
    assertEquals(BigDecimal.sum($("0"), $("0")), $("0"))
    assertEquals(BigDecimal.sum($("2"), $("1")), $("3"))
    assertEquals(BigDecimal.sum($("3.00000"), $("50")), $("53"))
    assertEquals(BigDecimal.sum($("1.23"), $("0.0045678")), $("1.2345678"))
    assertEquals(BigDecimal.sum($("123.456"), $("-123.456")), $("0"))
  })

  it("multiply", () => {
    assertEquals(BigDecimal.multiply($("3"), $("2")), $("6"))
    assertEquals(BigDecimal.multiply($("3"), $("0")), $("0"))
    assertEquals(BigDecimal.multiply($("3"), $("-1")), $("-3"))
    assertEquals(BigDecimal.multiply($("3"), $("0.5")), $("1.5"))
    assertEquals(BigDecimal.multiply($("3"), $("-2.5")), $("-7.5"))
  })

  it("subtract", () => {
    assertEquals(BigDecimal.subtract($("0"), $("1")), $("-1"))
    assertEquals(BigDecimal.subtract($("2.1"), $("1")), $("1.1"))
    assertEquals(BigDecimal.subtract($("3"), $("1")), $("2"))
    assertEquals(BigDecimal.subtract($("3"), $("0")), $("3"))
    assertEquals(BigDecimal.subtract($("3"), $("-1")), $("4"))
    assertEquals(BigDecimal.subtract($("3"), $("0.5")), $("2.5"))
    assertEquals(BigDecimal.subtract($("3"), $("-2.5")), $("5.5"))
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
      assertEquals(BigDecimal.divide($(x), $(y)).pipe(Option.getOrThrow), $(z))
      assertEquals(BigDecimal.unsafeDivide($(x), $(y)), $(z))
    }

    assertNone(BigDecimal.divide($("5"), $("0")))
    throws(() => BigDecimal.unsafeDivide($("5"), $("0")), new RangeError("Division by zero"))
  })

  it("Equivalence", () => {
    assertTrue(BigDecimal.Equivalence($("1"), $("1")))
    assertTrue(BigDecimal.Equivalence($("0.00012300"), $("0.000123")))
    assertTrue(BigDecimal.Equivalence($("5"), $("5.00")))
    assertFalse(BigDecimal.Equivalence($("1"), $("2")))
    assertFalse(BigDecimal.Equivalence($("1"), $("1.1")))
  })

  it("Order", () => {
    strictEqual(BigDecimal.Order($("1"), $("2")), -1)
    strictEqual(BigDecimal.Order($("2"), $("1")), 1)
    strictEqual(BigDecimal.Order($("2"), $("2")), 0)
    strictEqual(BigDecimal.Order($("1"), $("1.1")), -1)
    strictEqual(BigDecimal.Order($("1.1"), $("1")), 1)
    strictEqual(BigDecimal.Order($("0.00012300"), $("0.000123")), 0)
    strictEqual(BigDecimal.Order($("5"), $("5.000")), 0)
    strictEqual(BigDecimal.Order($("5"), $("0.500")), 1)
    strictEqual(BigDecimal.Order($("5"), $("50.00")), -1)
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
    assertFalse(BigDecimal.greaterThanOrEqualTo($("2"), $("3")))
    assertTrue(BigDecimal.greaterThanOrEqualTo($("3"), $("3")))
    assertTrue(BigDecimal.greaterThanOrEqualTo($("4"), $("3")))
  })

  it("between", () => {
    assertTrue(BigDecimal.between({ minimum: $("0"), maximum: $("5") })($("3")))
    assertFalse(BigDecimal.between({ minimum: $("0"), maximum: $("5") })($("-1")))
    assertFalse(BigDecimal.between({ minimum: $("0"), maximum: $("5") })($("6")))
    assertFalse(BigDecimal.between({ minimum: $("0.02"), maximum: $("5") })($("0.0123")))
    assertTrue(BigDecimal.between({ minimum: $("0.02"), maximum: $("5") })($("0.05")))

    assertTrue(BigDecimal.between($("3"), { minimum: $("0"), maximum: $("5") }))
  })

  it("clamp", () => {
    assertEquals(BigDecimal.clamp({ minimum: $("0"), maximum: $("5") })($("3")), $("3"))
    assertEquals(BigDecimal.clamp({ minimum: $("0"), maximum: $("5") })($("-1")), $("0"))
    assertEquals(BigDecimal.clamp({ minimum: $("0"), maximum: $("5") })($("6")), $("5"))
    assertEquals(BigDecimal.clamp({ minimum: $("0.02"), maximum: $("5") })($("0.0123")), $("0.02"))

    assertEquals(BigDecimal.clamp($("3"), { minimum: $("0"), maximum: $("5") }), $("3"))
  })

  it("min", () => {
    assertEquals(BigDecimal.min($("2"), $("3")), $("2"))
    assertEquals(BigDecimal.min($("5"), $("0.1")), $("0.1"))
    assertEquals(BigDecimal.min($("0.005"), $("3")), $("0.005"))
    assertEquals(BigDecimal.min($("123.456"), $("1.2")), $("1.2"))
  })

  it("max", () => {
    assertEquals(BigDecimal.max($("2"), $("3")), $("3"))
    assertEquals(BigDecimal.max($("5"), $("0.1")), $("5"))
    assertEquals(BigDecimal.max($("0.005"), $("3")), $("3"))
    assertEquals(BigDecimal.max($("123.456"), $("1.2")), $("123.456"))
  })

  it("abs", () => {
    assertEquals(BigDecimal.abs($("2")), $("2"))
    assertEquals(BigDecimal.abs($("-3")), $("3"))
    assertEquals(BigDecimal.abs($("0.000456")), $("0.000456"))
    assertEquals(BigDecimal.abs($("-0.123")), $("0.123"))
  })

  it("negate", () => {
    assertEquals(BigDecimal.negate($("2")), $("-2"))
    assertEquals(BigDecimal.negate($("-3")), $("3"))
    assertEquals(BigDecimal.negate($("0.000456")), $("-0.000456"))
    assertEquals(BigDecimal.negate($("-0.123")), $("0.123"))
  })

  it("remainder", () => {
    assertEquals(BigDecimal.remainder($("5"), $("2")).pipe(Option.getOrThrow), $("1"))
    assertEquals(BigDecimal.remainder($("4"), $("2")).pipe(Option.getOrThrow), $("0"))
    assertEquals(BigDecimal.remainder($("123.456"), $("0.2")).pipe(Option.getOrThrow), $("0.056"))
    assertNone(BigDecimal.remainder($("5"), $("0")))
  })

  it("unsafeRemainder", () => {
    assertEquals(BigDecimal.unsafeRemainder($("5"), $("2")), $("1"))
    assertEquals(BigDecimal.unsafeRemainder($("4"), $("2")), $("0"))
    assertEquals(BigDecimal.unsafeRemainder($("123.456"), $("0.2")), $("0.056"))
    throws(() => BigDecimal.unsafeRemainder($("5"), $("0")), new RangeError("Division by zero"))
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
    assertSome(BigDecimal.fromString("2"), BigDecimal.make(2n, 0))
    assertSome(BigDecimal.fromString("-2"), BigDecimal.make(-2n, 0))
    assertSome(BigDecimal.fromString("0.123"), BigDecimal.make(123n, 3))
    assertSome(BigDecimal.fromString("200"), BigDecimal.make(200n, 0))
    assertSome(BigDecimal.fromString("20000000"), BigDecimal.make(20000000n, 0))
    assertSome(BigDecimal.fromString("-20000000"), BigDecimal.make(-20000000n, 0))
    assertSome(BigDecimal.fromString("2.00"), BigDecimal.make(200n, 2))
    assertSome(BigDecimal.fromString("0.0000200"), BigDecimal.make(200n, 7))
    assertSome(BigDecimal.fromString(""), BigDecimal.normalize(BigDecimal.make(0n, 0)))
    assertSome(BigDecimal.fromString("1e5"), BigDecimal.make(1n, -5))
    assertSome(BigDecimal.fromString("1E15"), BigDecimal.make(1n, -15))
    assertSome(BigDecimal.fromString("1e+5"), BigDecimal.make(1n, -5))
    assertSome(BigDecimal.fromString("1E+15"), BigDecimal.make(1n, -15))
    assertSome(BigDecimal.fromString("-1.5E3"), BigDecimal.make(-15n, -2))
    assertSome(BigDecimal.fromString("-1.5e3"), BigDecimal.make(-15n, -2))
    assertSome(BigDecimal.fromString("-.5e3"), BigDecimal.make(-5n, -2))
    assertSome(BigDecimal.fromString("-5e3"), BigDecimal.make(-5n, -3))
    assertSome(BigDecimal.fromString("-5e-3"), BigDecimal.make(-5n, 3))
    assertSome(BigDecimal.fromString("15e-3"), BigDecimal.make(15n, 3))
    assertSome(BigDecimal.fromString("0.00002e5"), BigDecimal.make(2n, 0))
    assertSome(BigDecimal.fromString("0.00002e-5"), BigDecimal.make(2n, 10))
    assertNone(BigDecimal.fromString("0.0000e2e1"))
    assertNone(BigDecimal.fromString("0.1.2"))
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
