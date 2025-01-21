import * as Duration from "effect/Duration"
import * as Equal from "effect/Equal"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import { deepStrictEqual } from "effect/test/util"
import { assert, describe, expect, it } from "vitest"

describe("Duration", () => {
  it("decode", () => {
    const millis100 = Duration.millis(100)
    expect(Duration.decode(millis100) === millis100).toEqual(true)

    expect(Duration.decode(100)).toEqual(millis100)

    expect(Duration.decode(10n)).toEqual(Duration.nanos(10n))

    expect(Duration.decode("1 nano")).toEqual(Duration.nanos(1n))
    expect(Duration.decode("10 nanos")).toEqual(Duration.nanos(10n))
    expect(Duration.decode("1 micro")).toEqual(Duration.micros(1n))
    expect(Duration.decode("10 micros")).toEqual(Duration.micros(10n))
    expect(Duration.decode("1 milli")).toEqual(Duration.millis(1))
    expect(Duration.decode("10 millis")).toEqual(Duration.millis(10))
    expect(Duration.decode("1 second")).toEqual(Duration.seconds(1))
    expect(Duration.decode("10 seconds")).toEqual(Duration.seconds(10))
    expect(Duration.decode("1 minute")).toEqual(Duration.minutes(1))
    expect(Duration.decode("10 minutes")).toEqual(Duration.minutes(10))
    expect(Duration.decode("1 hour")).toEqual(Duration.hours(1))
    expect(Duration.decode("10 hours")).toEqual(Duration.hours(10))
    expect(Duration.decode("1 day")).toEqual(Duration.days(1))
    expect(Duration.decode("10 days")).toEqual(Duration.days(10))
    expect(Duration.decode("1 week")).toEqual(Duration.weeks(1))
    expect(Duration.decode("10 weeks")).toEqual(Duration.weeks(10))

    expect(Duration.decode("1.5 seconds")).toEqual(Duration.seconds(1.5))
    expect(Duration.decode("-1.5 seconds")).toEqual(Duration.zero)

    expect(Duration.decode([500, 123456789])).toEqual(Duration.nanos(500123456789n))
    expect(Duration.decode([-500, 123456789])).toEqual(Duration.zero)

    expect(() => Duration.decode("1.5 secs" as any)).toThrowError(new Error("Invalid DurationInput"))
    expect(() => Duration.decode(true as any)).toThrowError(new Error("Invalid DurationInput"))
    expect(() => Duration.decode({} as any)).toThrowError(new Error("Invalid DurationInput"))
  })

  it("decodeUnknown", () => {
    const millis100 = Duration.millis(100)
    expect(Duration.decodeUnknown(millis100)).toEqual(Option.some(millis100))

    expect(Duration.decodeUnknown(100)).toEqual(Option.some(millis100))

    expect(Duration.decodeUnknown(10n)).toEqual(Option.some(Duration.nanos(10n)))

    expect(Duration.decodeUnknown("1 nano")).toEqual(Option.some(Duration.nanos(1n)))
    expect(Duration.decodeUnknown("10 nanos")).toEqual(Option.some(Duration.nanos(10n)))
    expect(Duration.decodeUnknown("1 micro")).toEqual(Option.some(Duration.micros(1n)))
    expect(Duration.decodeUnknown("10 micros")).toEqual(Option.some(Duration.micros(10n)))
    expect(Duration.decodeUnknown("1 milli")).toEqual(Option.some(Duration.millis(1)))
    expect(Duration.decodeUnknown("10 millis")).toEqual(Option.some(Duration.millis(10)))
    expect(Duration.decodeUnknown("1 second")).toEqual(Option.some(Duration.seconds(1)))
    expect(Duration.decodeUnknown("10 seconds")).toEqual(Option.some(Duration.seconds(10)))
    expect(Duration.decodeUnknown("1 minute")).toEqual(Option.some(Duration.minutes(1)))
    expect(Duration.decodeUnknown("10 minutes")).toEqual(Option.some(Duration.minutes(10)))
    expect(Duration.decodeUnknown("1 hour")).toEqual(Option.some(Duration.hours(1)))
    expect(Duration.decodeUnknown("10 hours")).toEqual(Option.some(Duration.hours(10)))
    expect(Duration.decodeUnknown("1 day")).toEqual(Option.some(Duration.days(1)))
    expect(Duration.decodeUnknown("10 days")).toEqual(Option.some(Duration.days(10)))
    expect(Duration.decodeUnknown("1 week")).toEqual(Option.some(Duration.weeks(1)))
    expect(Duration.decodeUnknown("10 weeks")).toEqual(Option.some(Duration.weeks(10)))

    expect(Duration.decodeUnknown("1.5 seconds")).toEqual(Option.some(Duration.seconds(1.5)))
    expect(Duration.decodeUnknown("-1.5 seconds")).toEqual(Option.some(Duration.zero))

    expect(Duration.decodeUnknown([500, 123456789])).toEqual(Option.some(Duration.nanos(500123456789n)))
    expect(Duration.decodeUnknown([-500, 123456789])).toEqual(Option.some(Duration.zero))

    expect(Duration.decodeUnknown("1.5 secs")).toEqual(Option.none())
    expect(Duration.decodeUnknown(true)).toEqual(Option.none())
    expect(Duration.decodeUnknown({})).toEqual(Option.none())
  })

  it("Order", () => {
    deepStrictEqual(Duration.Order(Duration.millis(1), Duration.millis(2)), -1)
    deepStrictEqual(Duration.Order(Duration.millis(2), Duration.millis(1)), 1)
    deepStrictEqual(Duration.Order(Duration.millis(2), Duration.millis(2)), 0)

    deepStrictEqual(Duration.Order(Duration.nanos(1n), Duration.nanos(2n)), -1)
    deepStrictEqual(Duration.Order(Duration.nanos(2n), Duration.nanos(1n)), 1)
    deepStrictEqual(Duration.Order(Duration.nanos(2n), Duration.nanos(2n)), 0)
  })

  it("Equivalence", () => {
    deepStrictEqual(Duration.Equivalence(Duration.millis(1), Duration.millis(1)), true)
    deepStrictEqual(Duration.Equivalence(Duration.millis(1), Duration.millis(2)), false)
    deepStrictEqual(Duration.Equivalence(Duration.millis(1), Duration.millis(2)), false)

    deepStrictEqual(Duration.Equivalence(Duration.nanos(1n), Duration.nanos(1n)), true)
    deepStrictEqual(Duration.Equivalence(Duration.nanos(1n), Duration.nanos(2n)), false)
    deepStrictEqual(Duration.Equivalence(Duration.nanos(1n), Duration.nanos(2n)), false)
  })

  it("max", () => {
    deepStrictEqual(Duration.max(Duration.millis(1), Duration.millis(2)), Duration.millis(2))
    deepStrictEqual(Duration.max(Duration.minutes(1), Duration.millis(2)), Duration.minutes(1))

    deepStrictEqual(Duration.max("1 minutes", "2 millis"), Duration.minutes(1))
  })

  it("min", () => {
    deepStrictEqual(Duration.min(Duration.millis(1), Duration.millis(2)), Duration.millis(1))
    deepStrictEqual(Duration.min(Duration.minutes(1), Duration.millis(2)), Duration.millis(2))

    deepStrictEqual(Duration.min("1 minutes", "2 millis"), Duration.millis(2))
  })

  it("clamp", () => {
    deepStrictEqual(
      Duration.clamp(Duration.millis(1), {
        minimum: Duration.millis(2),
        maximum: Duration.millis(3)
      }),
      Duration.millis(2)
    )
    deepStrictEqual(
      Duration.clamp(Duration.minutes(1.5), {
        minimum: Duration.minutes(1),
        maximum: Duration.minutes(2)
      }),
      Duration.minutes(1.5)
    )

    expect(Duration.clamp("1 millis", {
      minimum: "2 millis",
      maximum: "3 millis"
    })).toStrictEqual(Duration.millis(2))
  })

  it("equals", () => {
    assert.isTrue(pipe(Duration.hours(1), Duration.equals(Duration.minutes(60))))
    expect(Duration.equals("2 seconds", "2 seconds")).toBe(true)
    expect(Duration.equals("2 seconds", "3 seconds")).toBe(false)
  })

  it("between", () => {
    assert.isTrue(Duration.between(Duration.hours(1), {
      minimum: Duration.minutes(59),
      maximum: Duration.minutes(61)
    }))
    assert.isTrue(
      Duration.between(Duration.minutes(1), {
        minimum: Duration.seconds(59),
        maximum: Duration.seconds(61)
      })
    )

    assert.isTrue(Duration.between("1 minutes", {
      minimum: "59 seconds",
      maximum: "61 seconds"
    }))
  })

  it("divide", () => {
    expect(Duration.divide(Duration.minutes(1), 2)).toEqual(Option.some(Duration.seconds(30)))
    expect(Duration.divide(Duration.seconds(1), 3)).toEqual(Option.some(Duration.nanos(333333333n)))
    expect(Duration.divide(Duration.nanos(2n), 2)).toEqual(Option.some(Duration.nanos(1n)))
    expect(Duration.divide(Duration.nanos(1n), 3)).toEqual(Option.some(Duration.zero))
    expect(Duration.divide(Duration.infinity, 2)).toEqual(Option.some(Duration.infinity))
    expect(Duration.divide(Duration.zero, 2)).toEqual(Option.some(Duration.zero))
    expect(Duration.divide(Duration.minutes(1), 0)).toEqual(Option.none())
    expect(Duration.divide(Duration.minutes(1), -0)).toEqual(Option.none())
    expect(Duration.divide(Duration.nanos(1n), 0)).toEqual(Option.none())
    expect(Duration.divide(Duration.nanos(1n), -0)).toEqual(Option.none())
    expect(Duration.divide(Duration.minutes(1), 0.5)).toEqual(Option.some(Duration.minutes(2)))
    expect(Duration.divide(Duration.minutes(1), 1.5)).toEqual(Option.some(Duration.seconds(40)))
    expect(Duration.divide(Duration.minutes(1), NaN)).toEqual(Option.none())
    expect(Duration.divide(Duration.nanos(1n), 0.5)).toEqual(Option.none())
    expect(Duration.divide(Duration.nanos(1n), 1.5)).toEqual(Option.none())
    expect(Duration.divide(Duration.nanos(1n), NaN)).toEqual(Option.none())

    expect(Duration.divide("1 minute", 2)).toEqual(Option.some(Duration.seconds(30)))
  })

  it("unsafeDivide", () => {
    expect(Duration.unsafeDivide(Duration.minutes(1), 2)).toEqual(Duration.seconds(30))
    expect(Duration.unsafeDivide(Duration.seconds(1), 3)).toEqual(Duration.nanos(333333333n))
    expect(Duration.unsafeDivide(Duration.nanos(2n), 2)).toEqual(Duration.nanos(1n))
    expect(Duration.unsafeDivide(Duration.nanos(1n), 3)).toEqual(Duration.zero)
    expect(Duration.unsafeDivide(Duration.infinity, 2)).toEqual(Duration.infinity)
    expect(Duration.unsafeDivide(Duration.zero, 2)).toEqual(Duration.zero)
    expect(Duration.unsafeDivide(Duration.minutes(1), 0)).toEqual(Duration.infinity)
    expect(Duration.unsafeDivide(Duration.minutes(1), -0)).toEqual(Duration.zero)
    expect(Duration.unsafeDivide(Duration.nanos(1n), 0)).toEqual(Duration.infinity)
    expect(Duration.unsafeDivide(Duration.nanos(1n), -0)).toEqual(Duration.zero)
    expect(Duration.unsafeDivide(Duration.minutes(1), 0.5)).toEqual(Duration.minutes(2))
    expect(Duration.unsafeDivide(Duration.minutes(1), 1.5)).toEqual(Duration.seconds(40))
    expect(Duration.unsafeDivide(Duration.minutes(1), NaN)).toEqual(Duration.zero)
    expect(() => Duration.unsafeDivide(Duration.nanos(1n), 0.5)).toThrow()
    expect(() => Duration.unsafeDivide(Duration.nanos(1n), 1.5)).toThrow()
    expect(Duration.unsafeDivide(Duration.nanos(1n), NaN)).toEqual(Duration.zero)

    expect(Duration.unsafeDivide("1 minute", 2)).toEqual(Duration.seconds(30))
  })

  it("times", () => {
    expect(Duration.times(Duration.seconds(1), 60)).toEqual(Duration.minutes(1))
    expect(Duration.times(Duration.nanos(2n), 10)).toEqual(Duration.nanos(20n))
    expect(Duration.times(Duration.seconds(Infinity), 60)).toEqual(Duration.seconds(Infinity))

    expect(Duration.times("1 seconds", 60)).toEqual(Duration.minutes(1))
  })

  it("sum", () => {
    expect(Duration.sum(Duration.seconds(30), Duration.seconds(30))).toEqual(Duration.minutes(1))
    expect(Duration.sum(Duration.nanos(30n), Duration.nanos(30n))).toEqual(Duration.nanos(60n))
    expect(Duration.sum(Duration.seconds(Infinity), Duration.seconds(30))).toEqual(Duration.seconds(Infinity))
    expect(Duration.sum(Duration.seconds(30), Duration.seconds(Infinity))).toEqual(Duration.seconds(Infinity))

    expect(Duration.sum("30 seconds", "30 seconds")).toEqual(Duration.minutes(1))
  })

  it("subtract", () => {
    expect(Duration.subtract(Duration.seconds(30), Duration.seconds(10))).toEqual(Duration.seconds(20))
    expect(Duration.subtract(Duration.seconds(30), Duration.seconds(30))).toEqual(Duration.zero)
    expect(Duration.subtract(Duration.nanos(30n), Duration.nanos(10n))).toEqual(Duration.nanos(20n))
    expect(Duration.subtract(Duration.nanos(30n), Duration.nanos(30n))).toEqual(Duration.zero)
    expect(Duration.subtract(Duration.seconds(Infinity), Duration.seconds(30))).toEqual(Duration.seconds(Infinity))
    expect(Duration.subtract(Duration.seconds(30), Duration.seconds(Infinity))).toEqual(Duration.zero)

    expect(Duration.subtract("30 seconds", "10 seconds")).toEqual(Duration.seconds(20))
  })

  it("greaterThan", () => {
    assert.isTrue(pipe(Duration.seconds(30), Duration.greaterThan(Duration.seconds(20))))
    assert.isFalse(pipe(Duration.seconds(30), Duration.greaterThan(Duration.seconds(30))))
    assert.isFalse(pipe(Duration.seconds(30), Duration.greaterThan(Duration.seconds(60))))

    assert.isTrue(pipe(Duration.nanos(30n), Duration.greaterThan(Duration.nanos(20n))))
    assert.isFalse(pipe(Duration.nanos(30n), Duration.greaterThan(Duration.nanos(30n))))
    assert.isFalse(pipe(Duration.nanos(30n), Duration.greaterThan(Duration.nanos(60n))))

    assert.isTrue(pipe(Duration.millis(1), Duration.greaterThan(Duration.nanos(1n))))

    expect(Duration.greaterThan("2 seconds", "2 seconds")).toBe(false)
    expect(Duration.greaterThan("3 seconds", "2 seconds")).toBe(true)
    expect(Duration.greaterThan("2 seconds", "3 seconds")).toBe(false)
  })

  it("greaterThan - Infinity", () => {
    assert.isTrue(pipe(Duration.infinity, Duration.greaterThan(Duration.seconds(20))))
    assert.isFalse(pipe(Duration.seconds(-Infinity), Duration.greaterThan(Duration.infinity)))
    assert.isFalse(pipe(Duration.nanos(1n), Duration.greaterThan(Duration.infinity)))
  })

  it("greaterThanOrEqualTo", () => {
    assert.isTrue(pipe(Duration.seconds(30), Duration.greaterThanOrEqualTo(Duration.seconds(20))))
    assert.isTrue(pipe(Duration.seconds(30), Duration.greaterThanOrEqualTo(Duration.seconds(30))))
    assert.isFalse(pipe(Duration.seconds(30), Duration.greaterThanOrEqualTo(Duration.seconds(60))))

    assert.isTrue(pipe(Duration.nanos(30n), Duration.greaterThanOrEqualTo(Duration.nanos(20n))))
    assert.isTrue(pipe(Duration.nanos(30n), Duration.greaterThanOrEqualTo(Duration.nanos(30n))))
    assert.isFalse(pipe(Duration.nanos(30n), Duration.greaterThanOrEqualTo(Duration.nanos(60n))))

    expect(Duration.greaterThanOrEqualTo("2 seconds", "2 seconds")).toBe(true)
    expect(Duration.greaterThanOrEqualTo("3 seconds", "2 seconds")).toBe(true)
    expect(Duration.greaterThanOrEqualTo("2 seconds", "3 seconds")).toBe(false)
  })

  it("lessThan", () => {
    assert.isTrue(pipe(Duration.seconds(20), Duration.lessThan(Duration.seconds(30))))
    assert.isFalse(pipe(Duration.seconds(30), Duration.lessThan(Duration.seconds(30))))
    assert.isFalse(pipe(Duration.seconds(60), Duration.lessThan(Duration.seconds(30))))

    assert.isTrue(pipe(Duration.nanos(20n), Duration.lessThan(Duration.nanos(30n))))
    assert.isFalse(pipe(Duration.nanos(30n), Duration.lessThan(Duration.nanos(30n))))
    assert.isFalse(pipe(Duration.nanos(60n), Duration.lessThan(Duration.nanos(30n))))

    assert.isTrue(pipe(Duration.nanos(1n), Duration.lessThan(Duration.millis(1))))

    expect(Duration.lessThan("2 seconds", "2 seconds")).toBe(false)
    expect(Duration.lessThan("3 seconds", "2 seconds")).toBe(false)
    expect(Duration.lessThan("2 seconds", "3 seconds")).toBe(true)
  })

  it("lessThanOrEqualTo", () => {
    assert.isTrue(pipe(Duration.seconds(20), Duration.lessThanOrEqualTo(Duration.seconds(30))))
    assert.isTrue(pipe(Duration.seconds(30), Duration.lessThanOrEqualTo(Duration.seconds(30))))
    assert.isFalse(pipe(Duration.seconds(60), Duration.lessThanOrEqualTo(Duration.seconds(30))))

    assert.isTrue(pipe(Duration.nanos(20n), Duration.lessThanOrEqualTo(Duration.nanos(30n))))
    assert.isTrue(pipe(Duration.nanos(30n), Duration.lessThanOrEqualTo(Duration.nanos(30n))))
    assert.isFalse(pipe(Duration.nanos(60n), Duration.lessThanOrEqualTo(Duration.nanos(30n))))

    expect(Duration.lessThanOrEqualTo("2 seconds", "2 seconds")).toBe(true)
    expect(Duration.lessThanOrEqualTo("3 seconds", "2 seconds")).toBe(false)
    expect(Duration.lessThanOrEqualTo("2 seconds", "3 seconds")).toBe(true)
  })

  it("String()", () => {
    expect(String(Duration.infinity)).toEqual(`Duration(Infinity)`)
    expect(String(Duration.nanos(10n))).toEqual(`Duration(10ns)`)
    expect(String(Duration.millis(2))).toEqual(`Duration(2ms)`)
    expect(String(Duration.millis(2.125))).toEqual(`Duration(2ms 125000ns)`)
    expect(String(Duration.seconds(2))).toEqual(`Duration(2s)`)
    expect(String(Duration.seconds(2.5))).toEqual(`Duration(2s 500ms)`)
  })

  it("format", () => {
    expect(Duration.format(Duration.infinity)).toEqual(`Infinity`)
    expect(Duration.format(Duration.minutes(5))).toEqual(`5m`)
    expect(Duration.format(Duration.minutes(5.325))).toEqual(`5m 19s 500ms`)
    expect(Duration.format(Duration.hours(3))).toEqual(`3h`)
    expect(Duration.format(Duration.hours(3.11125))).toEqual(`3h 6m 40s 500ms`)
    expect(Duration.format(Duration.days(2))).toEqual(`2d`)
    expect(Duration.format(Duration.days(2.25))).toEqual(`2d 6h`)
    expect(Duration.format(Duration.weeks(1))).toEqual(`7d`)
  })

  it("format", () => {
    expect(Duration.parts(Duration.infinity)).toStrictEqual({
      days: Infinity,
      hours: Infinity,
      minutes: Infinity,
      seconds: Infinity,
      millis: Infinity,
      nanos: Infinity
    })

    expect(Duration.parts(Duration.minutes(5.325))).toStrictEqual({
      days: 0,
      hours: 0,
      minutes: 5,
      seconds: 19,
      millis: 500,
      nanos: 0
    })

    expect(Duration.parts(Duration.minutes(3.11125))).toStrictEqual({
      days: 0,
      hours: 0,
      minutes: 3,
      seconds: 6,
      millis: 675,
      nanos: 0
    })
  })

  it("toJSON", () => {
    expect(Duration.seconds(2).toJSON()).toEqual(
      { _id: "Duration", _tag: "Millis", millis: 2000 }
    )
  })

  it("toJSON/ non-integer millis", () => {
    expect(Duration.millis(1.5).toJSON()).toEqual(
      { _id: "Duration", _tag: "Nanos", hrtime: [0, 1_500_000] }
    )
  })

  it("toJSON/ nanos", () => {
    expect(Duration.nanos(5n).toJSON()).toEqual(
      { _id: "Duration", _tag: "Nanos", hrtime: [0, 5] }
    )
  })

  it("toJSON/ infinity", () => {
    expect(Duration.infinity.toJSON()).toEqual(
      { _id: "Duration", _tag: "Infinity" }
    )
  })

  it(`inspect`, () => {
    if (typeof window === "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { inspect } = require("node:util")
      expect(inspect(Duration.millis(1000))).toEqual(
        inspect({ _id: "Duration", _tag: "Millis", millis: 1000 })
      )
    }
  })

  it("sum/ Infinity", () => {
    expect(Duration.sum(Duration.seconds(1), Duration.infinity)).toEqual(Duration.infinity)
  })

  it(".pipe()", () => {
    expect(Duration.seconds(1).pipe(Duration.sum(Duration.seconds(1)))).toEqual(Duration.seconds(2))
  })

  it("isDuration", () => {
    expect(Duration.isDuration(Duration.millis(100))).toBe(true)
    expect(Duration.isDuration(null)).toBe(false)
  })

  it("zero", () => {
    expect(Duration.zero.value).toEqual({ _tag: "Millis", millis: 0 })
  })

  it("infinity", () => {
    expect(Duration.infinity.value).toEqual({ _tag: "Infinity" })
  })

  it("weeks", () => {
    expect(Equal.equals(Duration.weeks(1), Duration.days(7))).toBe(true)
    expect(Equal.equals(Duration.weeks(1), Duration.days(1))).toBe(false)
  })

  it("toMillis", () => {
    expect(Duration.millis(1).pipe(Duration.toMillis)).toBe(1)
    expect(Duration.nanos(1n).pipe(Duration.toMillis)).toBe(0.000001)
    expect(Duration.infinity.pipe(Duration.toMillis)).toBe(Infinity)

    expect(Duration.toMillis("1 millis")).toBe(1)
  })

  it("toSeconds", () => {
    expect(Duration.millis(1).pipe(Duration.toSeconds)).toBe(0.001)
    expect(Duration.nanos(1n).pipe(Duration.toSeconds)).toBe(1e-9)
    expect(Duration.infinity.pipe(Duration.toSeconds)).toBe(Infinity)

    expect(Duration.toSeconds("1 seconds")).toBe(1)
    expect(Duration.toSeconds("3 seconds")).toBe(3)
    expect(Duration.toSeconds("3 minutes")).toBe(180)
  })

  it("toNanos", () => {
    expect(Duration.nanos(1n).pipe(Duration.toNanos)).toEqual(Option.some(1n))
    expect(Duration.infinity.pipe(Duration.toNanos)).toEqual(Option.none())
    expect(Duration.millis(1.0005).pipe(Duration.toNanos)).toEqual(Option.some(1_000_500n))
    expect(Duration.millis(100).pipe(Duration.toNanos)).toEqual(Option.some(100_000_000n))

    expect(Duration.toNanos("1 nanos")).toStrictEqual(Option.some(1n))
  })

  it("unsafeToNanos", () => {
    expect(Duration.nanos(1n).pipe(Duration.unsafeToNanos)).toBe(1n)
    expect(() => Duration.infinity.pipe(Duration.unsafeToNanos)).toThrow()
    expect(Duration.millis(1.0005).pipe(Duration.unsafeToNanos)).toBe(1_000_500n)
    expect(Duration.millis(100).pipe(Duration.unsafeToNanos)).toEqual(100_000_000n)

    expect(Duration.unsafeToNanos("1 nanos")).toBe(1n)
  })

  it("toHrTime", () => {
    expect(Duration.millis(1).pipe(Duration.toHrTime)).toEqual([0, 1_000_000])
    expect(Duration.nanos(1n).pipe(Duration.toHrTime)).toEqual([0, 1])
    expect(Duration.nanos(1_000_000_001n).pipe(Duration.toHrTime)).toEqual([1, 1])
    expect(Duration.millis(1001).pipe(Duration.toHrTime)).toEqual([1, 1_000_000])
    expect(Duration.infinity.pipe(Duration.toHrTime)).toEqual([Infinity, 0])

    expect(Duration.toHrTime("1 millis")).toEqual([0, 1_000_000])
  })

  it("floor is 0", () => {
    expect(Duration.millis(-1)).toEqual(Duration.zero)
    expect(Duration.nanos(-1n)).toEqual(Duration.zero)
  })

  it("match", () => {
    const match = Duration.match({
      onMillis: () => "millis",
      onNanos: () => "nanos"
    })
    expect(match(Duration.decode("100 millis"))).toEqual("millis")
    expect(match(Duration.decode("10 nanos"))).toEqual("nanos")
    expect(match(Duration.decode(Infinity))).toEqual("millis")

    expect(match("100 millis")).toEqual("millis")
  })

  it("isFinite", () => {
    expect(Duration.isFinite(Duration.millis(100))).toBe(true)
    expect(Duration.isFinite(Duration.nanos(100n))).toBe(true)
    expect(Duration.isFinite(Duration.infinity)).toBe(false)
  })

  it("isZero", () => {
    expect(Duration.isZero(Duration.zero)).toBe(true)
    expect(Duration.isZero(Duration.millis(0))).toBe(true)
    expect(Duration.isZero(Duration.nanos(0n))).toBe(true)
    expect(Duration.isZero(Duration.infinity)).toBe(false)
    expect(Duration.isZero(Duration.millis(1))).toBe(false)
    expect(Duration.isZero(Duration.nanos(1n))).toBe(false)
  })

  it("toMinutes", () => {
    expect(Duration.millis(60000).pipe(Duration.toMinutes)).toBe(1)
    expect(Duration.nanos(60000000000n).pipe(Duration.toMinutes)).toBe(1)
    expect(Duration.infinity.pipe(Duration.toMinutes)).toBe(Infinity)

    expect(Duration.toMinutes("1 minute")).toBe(1)
    expect(Duration.toMinutes("2 minutes")).toBe(2)
    expect(Duration.toMinutes("1 hour")).toBe(60)
  })

  it("toHours", () => {
    expect(Duration.millis(3_600_000).pipe(Duration.toHours)).toBe(1)
    expect(Duration.nanos(3_600_000_000_000n).pipe(Duration.toHours)).toBe(1)
    expect(Duration.infinity.pipe(Duration.toHours)).toBe(Infinity)

    expect(Duration.toHours("1 hour")).toBe(1)
    expect(Duration.toHours("2 hours")).toBe(2)
    expect(Duration.toHours("1 day")).toBe(24)
  })

  it("toDays", () => {
    expect(Duration.millis(86_400_000).pipe(Duration.toDays)).toBe(1)
    expect(Duration.nanos(86_400_000_000_000n).pipe(Duration.toDays)).toBe(1)
    expect(Duration.infinity.pipe(Duration.toDays)).toBe(Infinity)

    expect(Duration.toDays("1 day")).toBe(1)
    expect(Duration.toDays("2 days")).toBe(2)
    expect(Duration.toDays("1 week")).toBe(7)
  })

  it("toWeeks", () => {
    expect(Duration.millis(604_800_000).pipe(Duration.toWeeks)).toBe(1)
    expect(Duration.nanos(604_800_000_000_000n).pipe(Duration.toWeeks)).toBe(1)
    expect(Duration.infinity.pipe(Duration.toWeeks)).toBe(Infinity)

    expect(Duration.toWeeks("1 week")).toBe(1)
    expect(Duration.toWeeks("2 weeks")).toBe(2)
    expect(Duration.toWeeks("14 days")).toBe(2)
  })
})
