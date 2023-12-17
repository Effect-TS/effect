import { assertFalse, assertTrue, deepStrictEqual } from "effect-test/util"
import * as BigDecimal from "effect/BigDecimal"
import * as Equal from "effect/Equal"
import * as Option from "effect/Option"
import { assert, describe, expect, it } from "vitest"

const _ = BigDecimal.unsafeFromString
const assertEquals = (a: BigDecimal.BigDecimal, b: BigDecimal.BigDecimal) => assertTrue(BigDecimal.equals(a, b))

describe("BigDecimal", () => {
  it("isBigDecimal", () => {
    assertTrue(BigDecimal.isBigDecimal(_("0")))
    assertTrue(BigDecimal.isBigDecimal(_("987")))
    assertTrue(BigDecimal.isBigDecimal(_("123.0")))
    assertTrue(BigDecimal.isBigDecimal(_("0.123")))
    assertTrue(BigDecimal.isBigDecimal(_("123.456")))
    assertFalse(BigDecimal.isBigDecimal("1"))
    assertFalse(BigDecimal.isBigDecimal(true))
  })

  it("sign", () => {
    deepStrictEqual(BigDecimal.sign(_("-5")), -1)
    deepStrictEqual(BigDecimal.sign(_("0")), 0)
    deepStrictEqual(BigDecimal.sign(_("5")), 1)
    deepStrictEqual(BigDecimal.sign(_("-123.456")), -1)
    deepStrictEqual(BigDecimal.sign(_("456.789")), 1)
  })

  it("equals", () => {
    assertTrue(BigDecimal.equals(_("1"), _("1")))
    assertTrue(BigDecimal.equals(_("0.00012300"), _("0.000123")))
    assertTrue(BigDecimal.equals(_("5"), _("5.0")))
    assertTrue(BigDecimal.equals(_("123.0000"), _("123.00")))
    assertFalse(BigDecimal.equals(_("1"), _("2")))
    assertFalse(BigDecimal.equals(_("1"), _("1.1")))
    assertFalse(BigDecimal.equals(_("1"), _("0.1")))
  })

  it("sum", () => {
    assertEquals(BigDecimal.sum(_("2"), _("0")), _("2"))
    assertEquals(BigDecimal.sum(_("0"), _("2")), _("2"))
    assertEquals(BigDecimal.sum(_("0"), _("0")), _("0"))
    assertEquals(BigDecimal.sum(_("2"), _("1")), _("3"))
    assertEquals(BigDecimal.sum(_("3.00000"), _("50")), _("53"))
    assertEquals(BigDecimal.sum(_("1.23"), _("0.0045678")), _("1.2345678"))
    assertEquals(BigDecimal.sum(_("123.456"), _("-123.456")), _("0"))
  })

  it("multiply", () => {
    assertEquals(BigDecimal.multiply(_("3"), _("2")), _("6"))
    assertEquals(BigDecimal.multiply(_("3"), _("0")), _("0"))
    assertEquals(BigDecimal.multiply(_("3"), _("-1")), _("-3"))
    assertEquals(BigDecimal.multiply(_("3"), _("0.5")), _("1.5"))
    assertEquals(BigDecimal.multiply(_("3"), _("-2.5")), _("-7.5"))
  })

  it("subtract", () => {
    assertEquals(BigDecimal.subtract(_("0"), _("1")), _("-1"))
    assertEquals(BigDecimal.subtract(_("2.1"), _("1")), _("1.1"))
    assertEquals(BigDecimal.subtract(_("3"), _("1")), _("2"))
    assertEquals(BigDecimal.subtract(_("3"), _("0")), _("3"))
    assertEquals(BigDecimal.subtract(_("3"), _("-1")), _("4"))
    assertEquals(BigDecimal.subtract(_("3"), _("0.5")), _("2.5"))
    assertEquals(BigDecimal.subtract(_("3"), _("-2.5")), _("5.5"))
  })

  it("roundTerminal", () => {
    expect(BigDecimal.roundTerminal(0n)).toStrictEqual(0n)
    expect(BigDecimal.roundTerminal(4n)).toStrictEqual(0n)
    expect(BigDecimal.roundTerminal(5n)).toStrictEqual(1n)
    expect(BigDecimal.roundTerminal(9n)).toStrictEqual(1n)
    expect(BigDecimal.roundTerminal(49n)).toStrictEqual(0n)
    expect(BigDecimal.roundTerminal(59n)).toStrictEqual(1n)
    expect(BigDecimal.roundTerminal(99n)).toStrictEqual(1n)
    expect(BigDecimal.roundTerminal(-4n)).toStrictEqual(0n)
    expect(BigDecimal.roundTerminal(-5n)).toStrictEqual(1n)
    expect(BigDecimal.roundTerminal(-9n)).toStrictEqual(1n)
    expect(BigDecimal.roundTerminal(-49n)).toStrictEqual(0n)
    expect(BigDecimal.roundTerminal(-59n)).toStrictEqual(1n)
    expect(BigDecimal.roundTerminal(-99n)).toStrictEqual(1n)
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
      assertEquals(BigDecimal.divide(_(x), _(y)).pipe(Option.getOrThrow), _(z))
      assertEquals(BigDecimal.unsafeDivide(_(x), _(y)), _(z))
    }

    deepStrictEqual(BigDecimal.divide(_("5"), _("0")), Option.none())
    assert.throws(() => BigDecimal.unsafeDivide(_("5"), _("0")), "Division by zero")
  })

  it("Equivalence", () => {
    assertTrue(BigDecimal.Equivalence(_("1"), _("1")))
    assertTrue(BigDecimal.Equivalence(_("0.00012300"), _("0.000123")))
    assertTrue(BigDecimal.Equivalence(_("5"), _("5.00")))
    assertFalse(BigDecimal.Equivalence(_("1"), _("2")))
    assertFalse(BigDecimal.Equivalence(_("1"), _("1.1")))
  })

  it("Order", () => {
    deepStrictEqual(BigDecimal.Order(_("1"), _("2")), -1)
    deepStrictEqual(BigDecimal.Order(_("2"), _("1")), 1)
    deepStrictEqual(BigDecimal.Order(_("2"), _("2")), 0)
    deepStrictEqual(BigDecimal.Order(_("1"), _("1.1")), -1)
    deepStrictEqual(BigDecimal.Order(_("1.1"), _("1")), 1)
    deepStrictEqual(BigDecimal.Order(_("0.00012300"), _("0.000123")), 0)
    deepStrictEqual(BigDecimal.Order(_("5"), _("5.000")), 0)
    deepStrictEqual(BigDecimal.Order(_("5"), _("0.500")), 1)
    deepStrictEqual(BigDecimal.Order(_("5"), _("50.00")), -1)
  })

  it("lessThan", () => {
    assertTrue(BigDecimal.lessThan(_("2"), _("3")))
    assertFalse(BigDecimal.lessThan(_("3"), _("3")))
    assertFalse(BigDecimal.lessThan(_("4"), _("3")))
  })

  it("lessThanOrEqualTo", () => {
    assertTrue(BigDecimal.lessThanOrEqualTo(_("2"), _("3")))
    assertTrue(BigDecimal.lessThanOrEqualTo(_("3"), _("3")))
    assertFalse(BigDecimal.lessThanOrEqualTo(_("4"), _("3")))
  })

  it("greaterThan", () => {
    assertFalse(BigDecimal.greaterThan(_("2"), _("3")))
    assertFalse(BigDecimal.greaterThan(_("3"), _("3")))
    assertTrue(BigDecimal.greaterThan(_("4"), _("3")))
  })

  it("greaterThanOrEqualTo", () => {
    deepStrictEqual(BigDecimal.greaterThanOrEqualTo(_("2"), _("3")), false)
    deepStrictEqual(BigDecimal.greaterThanOrEqualTo(_("3"), _("3")), true)
    deepStrictEqual(BigDecimal.greaterThanOrEqualTo(_("4"), _("3")), true)
  })

  it("between", () => {
    deepStrictEqual(BigDecimal.between({ minimum: _("0"), maximum: _("5") })(_("3")), true)
    deepStrictEqual(BigDecimal.between({ minimum: _("0"), maximum: _("5") })(_("-1")), false)
    deepStrictEqual(BigDecimal.between({ minimum: _("0"), maximum: _("5") })(_("6")), false)
    deepStrictEqual(BigDecimal.between({ minimum: _("0.02"), maximum: _("5") })(_("0.0123")), false)
    deepStrictEqual(BigDecimal.between({ minimum: _("0.02"), maximum: _("5") })(_("0.05")), true)

    deepStrictEqual(BigDecimal.between(_("3"), { minimum: _("0"), maximum: _("5") }), true)
  })

  it("clamp", () => {
    assertEquals(BigDecimal.clamp({ minimum: _("0"), maximum: _("5") })(_("3")), _("3"))
    assertEquals(BigDecimal.clamp({ minimum: _("0"), maximum: _("5") })(_("-1")), _("0"))
    assertEquals(BigDecimal.clamp({ minimum: _("0"), maximum: _("5") })(_("6")), _("5"))
    assertEquals(BigDecimal.clamp({ minimum: _("0.02"), maximum: _("5") })(_("0.0123")), _("0.02"))

    assertEquals(BigDecimal.clamp(_("3"), { minimum: _("0"), maximum: _("5") }), _("3"))
  })

  it("min", () => {
    assertEquals(BigDecimal.min(_("2"), _("3")), _("2"))
    assertEquals(BigDecimal.min(_("5"), _("0.1")), _("0.1"))
    assertEquals(BigDecimal.min(_("0.005"), _("3")), _("0.005"))
    assertEquals(BigDecimal.min(_("123.456"), _("1.2")), _("1.2"))
  })

  it("max", () => {
    assertEquals(BigDecimal.max(_("2"), _("3")), _("3"))
    assertEquals(BigDecimal.max(_("5"), _("0.1")), _("5"))
    assertEquals(BigDecimal.max(_("0.005"), _("3")), _("3"))
    assertEquals(BigDecimal.max(_("123.456"), _("1.2")), _("123.456"))
  })

  it("abs", () => {
    assertEquals(BigDecimal.abs(_("2")), _("2"))
    assertEquals(BigDecimal.abs(_("-3")), _("3"))
    assertEquals(BigDecimal.abs(_("0.000456")), _("0.000456"))
    assertEquals(BigDecimal.abs(_("-0.123")), _("0.123"))
  })

  it("negate", () => {
    assertEquals(BigDecimal.negate(_("2")), _("-2"))
    assertEquals(BigDecimal.negate(_("-3")), _("3"))
    assertEquals(BigDecimal.negate(_("0.000456")), _("-0.000456"))
    assertEquals(BigDecimal.negate(_("-0.123")), _("0.123"))
  })

  it("remainder", () => {
    assertEquals(BigDecimal.remainder(_("5"), _("2")).pipe(Option.getOrThrow), _("1"))
    assertEquals(BigDecimal.remainder(_("4"), _("2")).pipe(Option.getOrThrow), _("0"))
    assertEquals(BigDecimal.remainder(_("123.456"), _("0.2")).pipe(Option.getOrThrow), _("0.056"))
    deepStrictEqual(BigDecimal.remainder(_("5"), _("0")), Option.none())
  })

  it("unsafeRemainder", () => {
    assertEquals(BigDecimal.unsafeRemainder(_("5"), _("2")), _("1"))
    assertEquals(BigDecimal.unsafeRemainder(_("4"), _("2")), _("0"))
    assertEquals(BigDecimal.unsafeRemainder(_("123.456"), _("0.2")), _("0.056"))
    assert.throws(() => BigDecimal.unsafeRemainder(_("5"), _("0")), "Division by zero")
  })

  it("normalize", () => {
    deepStrictEqual(BigDecimal.normalize(_("0")), BigDecimal.unsafeMakeNormalized(0n, 0))
    deepStrictEqual(BigDecimal.normalize(_("0.123000")), BigDecimal.unsafeMakeNormalized(123n, 3))
    deepStrictEqual(BigDecimal.normalize(_("123.000")), BigDecimal.unsafeMakeNormalized(123n, 0))
    deepStrictEqual(BigDecimal.normalize(_("-0.000123000")), BigDecimal.unsafeMakeNormalized(-123n, 6))
    deepStrictEqual(BigDecimal.normalize(_("-123.000")), BigDecimal.unsafeMakeNormalized(-123n, 0))
    deepStrictEqual(BigDecimal.normalize(_("12300000")), BigDecimal.unsafeMakeNormalized(123n, -5))
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
    deepStrictEqual(BigDecimal.fromString("1E5"), Option.none())
  })

  it("format", () => {
    deepStrictEqual(BigDecimal.format(_("2")), "2")
    deepStrictEqual(BigDecimal.format(_("-2")), "-2")
    deepStrictEqual(BigDecimal.format(_("0.123")), "0.123")
    deepStrictEqual(BigDecimal.format(_("200")), "200")
    deepStrictEqual(BigDecimal.format(_("20000000")), "20000000")
    deepStrictEqual(BigDecimal.format(_("-20000000")), "-20000000")
    deepStrictEqual(BigDecimal.format(_("2.00")), "2.00")
    deepStrictEqual(BigDecimal.format(_("0.200")), "0.200")
    deepStrictEqual(BigDecimal.format(_("0.123000")), "0.123000")
    deepStrictEqual(BigDecimal.format(_("-456.123")), "-456.123")
    deepStrictEqual(BigDecimal.format(BigDecimal.make(10n, -1)), "100")
  })

  it("toJSON()", () => {
    deepStrictEqual(JSON.stringify(_("2")), JSON.stringify({ _id: "BigDecimal", value: "2", scale: 0 }))
  })

  it("inspect", () => {
    if (typeof window === "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { inspect } = require("node:util")
      expect(inspect(_("2"))).toEqual(inspect({ _id: "BigDecimal", value: "2", scale: 0 }))
    }
  })

  it("toString()", () => {
    deepStrictEqual(String(_("2")), "BigDecimal(2)")
  })

  it("Equal.symbol", () => {
    expect(Equal.equals(_("2"), _("2"))).toBe(true)
  })

  it("pipe()", () => {
    expect(_("2").pipe(BigDecimal.multiply(_("3")))).toEqual(_("6"))
  })

  it("scale", () => {
    expect(BigDecimal.scale(_("3.0005"), 3)).toStrictEqual(_("3.000"))
  })

  it("fromBigInt", () => {
    expect(BigDecimal.fromBigInt(1n)).toStrictEqual(BigDecimal.make(1n, 0))
  })

  it("fromNumber", () => {
    expect(BigDecimal.fromNumber(123)).toStrictEqual(BigDecimal.make(123n, 0))
    expect(BigDecimal.fromNumber(123.456)).toStrictEqual(BigDecimal.make(123456n, 3))
  })

  it("unsafeToNumber", () => {
    assert.deepStrictEqual(BigDecimal.unsafeToNumber(_("123.456")), 123.456)
  })

  it("isInteger", () => {
    assert.deepStrictEqual(BigDecimal.isInteger(_("0")), true)
    assert.deepStrictEqual(BigDecimal.isInteger(_("1")), true)
    assert.deepStrictEqual(BigDecimal.isInteger(_("1.1")), false)
  })

  it("isZero", () => {
    assert.deepStrictEqual(BigDecimal.isZero(_("0")), true)
    assert.deepStrictEqual(BigDecimal.isZero(_("1")), false)
  })

  it("isNegative", () => {
    assert.deepStrictEqual(BigDecimal.isNegative(_("-1")), true)
    assert.deepStrictEqual(BigDecimal.isNegative(_("0")), false)
    assert.deepStrictEqual(BigDecimal.isNegative(_("1")), false)
  })

  it("isPositive", () => {
    assert.deepStrictEqual(BigDecimal.isPositive(_("-1")), false)
    assert.deepStrictEqual(BigDecimal.isPositive(_("0")), false)
    assert.deepStrictEqual(BigDecimal.isPositive(_("1")), true)
  })
})
