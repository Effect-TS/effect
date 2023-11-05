import { assertFalse, assertTrue, deepStrictEqual } from "effect-test/util"
import { BigDecimal as BD } from "effect/BigDecimal"
import { Option } from "effect/Option"
import { assert, describe, it } from "vitest"

const _ = BD.unsafeFromString
const assertEquals = (a: BD.BigDecimal, b: BD.BigDecimal) => assertTrue(BD.equals(a, b))

describe.concurrent("BigDecimal", () => {
  it("isBigDecimal", () => {
    assertTrue(BD.isBigDecimal(_("0")))
    assertTrue(BD.isBigDecimal(_("987")))
    assertTrue(BD.isBigDecimal(_("123.0")))
    assertTrue(BD.isBigDecimal(_("0.123")))
    assertTrue(BD.isBigDecimal(_("123.456")))
    assertFalse(BD.isBigDecimal("1"))
    assertFalse(BD.isBigDecimal(true))
  })

  it("sign", () => {
    deepStrictEqual(BD.sign(_("-5")), -1)
    deepStrictEqual(BD.sign(_("0")), 0)
    deepStrictEqual(BD.sign(_("5")), 1)
    deepStrictEqual(BD.sign(_("-123.456")), -1)
    deepStrictEqual(BD.sign(_("456.789")), 1)
  })

  it("equals", () => {
    assertTrue(BD.equals(_("1"), _("1")))
    assertTrue(BD.equals(_("0.00012300"), _("0.000123")))
    assertTrue(BD.equals(_("5"), _("5.0")))
    assertTrue(BD.equals(_("123.0000"), _("123.00")))
    assertFalse(BD.equals(_("1"), _("2")))
    assertFalse(BD.equals(_("1"), _("1.1")))
    assertFalse(BD.equals(_("1"), _("0.1")))
  })

  it("sum", () => {
    assertEquals(BD.sum(_("2"), _("1")), _("3"))
    assertEquals(BD.sum(_("3.00000"), _("50")), _("53"))
    assertEquals(BD.sum(_("1.23"), _("0.0045678")), _("1.2345678"))
    assertEquals(BD.sum(_("0"), _("0")), _("0"))
    assertEquals(BD.sum(_("123.456"), _("-123.456")), _("0"))
  })

  it("multiply", () => {
    assertEquals(BD.multiply(_("3"), _("2")), _("6"))
    assertEquals(BD.multiply(_("3"), _("0")), _("0"))
    assertEquals(BD.multiply(_("3"), _("-1")), _("-3"))
    assertEquals(BD.multiply(_("3"), _("0.5")), _("1.5"))
    assertEquals(BD.multiply(_("3"), _("-2.5")), _("-7.5"))
  })

  it("subtract", () => {
    assertEquals(BD.subtract(_("3"), _("1")), _("2"))
    assertEquals(BD.subtract(_("3"), _("0")), _("3"))
    assertEquals(BD.subtract(_("3"), _("-1")), _("4"))
    assertEquals(BD.subtract(_("3"), _("0.5")), _("2.5"))
    assertEquals(BD.subtract(_("3"), _("-2.5")), _("5.5"))
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
      assertEquals(BD.divide(_(x), _(y)).pipe(Option.getOrThrow), _(z))
      assertEquals(BD.unsafeDivide(_(x), _(y)), _(z))
    }

    deepStrictEqual(BD.divide(_("5"), _("0")), Option.none())
    assert.throws(() => BD.unsafeDivide(_("5"), _("0")), "Division by zero")
  })

  it("Equivalence", () => {
    assertTrue(BD.Equivalence(_("1"), _("1")))
    assertTrue(BD.Equivalence(_("0.00012300"), _("0.000123")))
    assertTrue(BD.Equivalence(_("5"), _("5.00")))
    assertFalse(BD.Equivalence(_("1"), _("2")))
    assertFalse(BD.Equivalence(_("1"), _("1.1")))
  })

  it("Order", () => {
    deepStrictEqual(BD.Order(_("1"), _("2")), -1)
    deepStrictEqual(BD.Order(_("2"), _("1")), 1)
    deepStrictEqual(BD.Order(_("2"), _("2")), 0)
    deepStrictEqual(BD.Order(_("1"), _("1.1")), -1)
    deepStrictEqual(BD.Order(_("1.1"), _("1")), 1)
    deepStrictEqual(BD.Order(_("0.00012300"), _("0.000123")), 0)
    deepStrictEqual(BD.Order(_("5"), _("5.000")), 0)
    deepStrictEqual(BD.Order(_("5"), _("0.500")), 1)
    deepStrictEqual(BD.Order(_("5"), _("50.00")), -1)
  })

  it("lessThan", () => {
    assertTrue(BD.lessThan(_("2"), _("3")))
    assertFalse(BD.lessThan(_("3"), _("3")))
    assertFalse(BD.lessThan(_("4"), _("3")))
  })

  it("lessThanOrEqualTo", () => {
    assertTrue(BD.lessThanOrEqualTo(_("2"), _("3")))
    assertTrue(BD.lessThanOrEqualTo(_("3"), _("3")))
    assertFalse(BD.lessThanOrEqualTo(_("4"), _("3")))
  })

  it("greaterThan", () => {
    assertFalse(BD.greaterThan(_("2"), _("3")))
    assertFalse(BD.greaterThan(_("3"), _("3")))
    assertTrue(BD.greaterThan(_("4"), _("3")))
  })

  it("greaterThanOrEqualTo", () => {
    deepStrictEqual(BD.greaterThanOrEqualTo(_("2"), _("3")), false)
    deepStrictEqual(BD.greaterThanOrEqualTo(_("3"), _("3")), true)
    deepStrictEqual(BD.greaterThanOrEqualTo(_("4"), _("3")), true)
  })

  it("between", () => {
    deepStrictEqual(BD.between(_("0"), _("5"))(_("3")), true)
    deepStrictEqual(BD.between(_("0"), _("5"))(_("-1")), false)
    deepStrictEqual(BD.between(_("0"), _("5"))(_("6")), false)
    deepStrictEqual(BD.between(_("0.02"), _("5"))(_("0.0123")), false)
    deepStrictEqual(BD.between(_("0.02"), _("5"))(_("0.05")), true)
  })

  it("clamp", () => {
    assertEquals(BD.clamp(_("0"), _("5"))(_("3")), _("3"))
    assertEquals(BD.clamp(_("0"), _("5"))(_("-1")), _("0"))
    assertEquals(BD.clamp(_("0"), _("5"))(_("6")), _("5"))
    assertEquals(BD.clamp(_("0.02"), _("5"))(_("0.0123")), _("0.02"))
  })

  it("min", () => {
    assertEquals(BD.min(_("2"), _("3")), _("2"))
    assertEquals(BD.min(_("5"), _("0.1")), _("0.1"))
    assertEquals(BD.min(_("0.005"), _("3")), _("0.005"))
    assertEquals(BD.min(_("123.456"), _("1.2")), _("1.2"))
  })

  it("max", () => {
    assertEquals(BD.max(_("2"), _("3")), _("3"))
    assertEquals(BD.max(_("5"), _("0.1")), _("5"))
    assertEquals(BD.max(_("0.005"), _("3")), _("3"))
    assertEquals(BD.max(_("123.456"), _("1.2")), _("123.456"))
  })

  it("abs", () => {
    assertEquals(BD.abs(_("2")), _("2"))
    assertEquals(BD.abs(_("-3")), _("3"))
    assertEquals(BD.abs(_("0.000456")), _("0.000456"))
    assertEquals(BD.abs(_("-0.123")), _("0.123"))
  })

  it("negate", () => {
    assertEquals(BD.negate(_("2")), _("-2"))
    assertEquals(BD.negate(_("-3")), _("3"))
    assertEquals(BD.negate(_("0.000456")), _("-0.000456"))
    assertEquals(BD.negate(_("-0.123")), _("0.123"))
  })

  it("remainder", () => {
    assertEquals(BD.remainder(_("5"), _("2")).pipe(Option.getOrThrow), _("1"))
    assertEquals(BD.remainder(_("4"), _("2")).pipe(Option.getOrThrow), _("0"))
    assertEquals(BD.remainder(_("123.456"), _("0.2")).pipe(Option.getOrThrow), _("0.056"))
    deepStrictEqual(BD.remainder(_("5"), _("0")), Option.none())
  })

  it("unsafeRemainder", () => {
    assertEquals(BD.unsafeRemainder(_("5"), _("2")), _("1"))
    assertEquals(BD.unsafeRemainder(_("4"), _("2")), _("0"))
    assertEquals(BD.unsafeRemainder(_("123.456"), _("0.2")), _("0.056"))
    assert.throws(() => BD.unsafeRemainder(_("5"), _("0")), "Division by zero")
  })

  it("normalize", () => {
    deepStrictEqual(BD.normalize(_("0.123000")), _("0.123"))
    deepStrictEqual(BD.normalize(_("123.000")), _("123"))
    deepStrictEqual(BD.normalize(_("-0.000123000")), _("-0.000123"))
    deepStrictEqual(BD.normalize(_("-123.000")), _("-123"))
    deepStrictEqual(BD.normalize(_("12300000")), BD.make(123n, -5))
  })

  it("fromString", () => {
    deepStrictEqual(BD.fromString("2"), Option.some(BD.make(2n, 0)))
    deepStrictEqual(BD.fromString("-2"), Option.some(BD.make(-2n, 0)))
    deepStrictEqual(BD.fromString("0.123"), Option.some(BD.make(123n, 3)))
    deepStrictEqual(BD.fromString("200"), Option.some(BD.make(200n, 0)))
    deepStrictEqual(BD.fromString("20000000"), Option.some(BD.make(20000000n, 0)))
    deepStrictEqual(BD.fromString("-20000000"), Option.some(BD.make(-20000000n, 0)))
    deepStrictEqual(BD.fromString("2.00"), Option.some(BD.make(200n, 2)))
    deepStrictEqual(BD.fromString("0.0000200"), Option.some(BD.make(200n, 7)))
    deepStrictEqual(BD.fromString(""), Option.some(BD.make(0n, 0)))
    deepStrictEqual(BD.fromString("1E5"), Option.none())
  })

  it("toString", () => {
    deepStrictEqual(BD.toString(_("2")), "2")
    deepStrictEqual(BD.toString(_("-2")), "-2")
    deepStrictEqual(BD.toString(_("0.123")), "0.123")
    deepStrictEqual(BD.toString(_("200")), "200")
    deepStrictEqual(BD.toString(_("20000000")), "20000000")
    deepStrictEqual(BD.toString(_("-20000000")), "-20000000")
    deepStrictEqual(BD.toString(_("2.00")), "2.00")
    deepStrictEqual(BD.toString(_("0.200")), "0.200")
    deepStrictEqual(BD.toString(_("0.123000")), "0.123000")
    deepStrictEqual(BD.toString(_("-456.123")), "-456.123")
  })
})
