import { describe, it } from "@effect/vitest"
import {
  assertFalse,
  assertNone,
  assertSome,
  assertTrue,
  deepStrictEqual,
  strictEqual,
  throws
} from "@effect/vitest/utils"
import { Duration, Equal, pipe } from "effect"

describe("Duration", () => {
  it("decode", () => {
    const millis100 = Duration.millis(100)
    assertTrue(Duration.decode(millis100) === millis100)

    deepStrictEqual(Duration.decode(100), millis100)

    deepStrictEqual(Duration.decode(10n), Duration.nanos(10n))

    deepStrictEqual(Duration.decode("1 nano"), Duration.nanos(1n))
    deepStrictEqual(Duration.decode("10 nanos"), Duration.nanos(10n))
    deepStrictEqual(Duration.decode("1 micro"), Duration.micros(1n))
    deepStrictEqual(Duration.decode("10 micros"), Duration.micros(10n))
    deepStrictEqual(Duration.decode("1 milli"), Duration.millis(1))
    deepStrictEqual(Duration.decode("10 millis"), Duration.millis(10))
    deepStrictEqual(Duration.decode("1 second"), Duration.seconds(1))
    deepStrictEqual(Duration.decode("10 seconds"), Duration.seconds(10))
    deepStrictEqual(Duration.decode("1 minute"), Duration.minutes(1))
    deepStrictEqual(Duration.decode("10 minutes"), Duration.minutes(10))
    deepStrictEqual(Duration.decode("1 hour"), Duration.hours(1))
    deepStrictEqual(Duration.decode("10 hours"), Duration.hours(10))
    deepStrictEqual(Duration.decode("1 day"), Duration.days(1))
    deepStrictEqual(Duration.decode("10 days"), Duration.days(10))
    deepStrictEqual(Duration.decode("1 week"), Duration.weeks(1))
    deepStrictEqual(Duration.decode("10 weeks"), Duration.weeks(10))

    deepStrictEqual(Duration.decode("1.5 seconds"), Duration.seconds(1.5))
    deepStrictEqual(Duration.decode("-1.5 seconds"), Duration.zero)

    deepStrictEqual(Duration.decode([500, 123456789]), Duration.nanos(500123456789n))
    deepStrictEqual(Duration.decode([-500, 123456789]), Duration.zero)
    deepStrictEqual(Duration.decode([Infinity, 0]), Duration.infinity)
    deepStrictEqual(Duration.decode([-Infinity, 0]), Duration.zero)
    deepStrictEqual(Duration.decode([NaN, 0]), Duration.zero)
    deepStrictEqual(Duration.decode([0, Infinity]), Duration.infinity)
    deepStrictEqual(Duration.decode([0, -Infinity]), Duration.zero)
    deepStrictEqual(Duration.decode([0, NaN]), Duration.zero)
    throws(() => Duration.decode("1.5 secs" as any), new Error("Invalid DurationInput"))
    throws(() => Duration.decode(true as any), new Error("Invalid DurationInput"))
    throws(() => Duration.decode({} as any), new Error("Invalid DurationInput"))
  })

  it("decodeUnknown", () => {
    const millis100 = Duration.millis(100)
    assertSome(Duration.decodeUnknown(millis100), millis100)

    assertSome(Duration.decodeUnknown(100), millis100)

    assertSome(Duration.decodeUnknown(10n), Duration.nanos(10n))

    assertSome(Duration.decodeUnknown("1 nano"), Duration.nanos(1n))
    assertSome(Duration.decodeUnknown("10 nanos"), Duration.nanos(10n))
    assertSome(Duration.decodeUnknown("1 micro"), Duration.micros(1n))
    assertSome(Duration.decodeUnknown("10 micros"), Duration.micros(10n))
    assertSome(Duration.decodeUnknown("1 milli"), Duration.millis(1))
    assertSome(Duration.decodeUnknown("10 millis"), Duration.millis(10))
    assertSome(Duration.decodeUnknown("1 second"), Duration.seconds(1))
    assertSome(Duration.decodeUnknown("10 seconds"), Duration.seconds(10))
    assertSome(Duration.decodeUnknown("1 minute"), Duration.minutes(1))
    assertSome(Duration.decodeUnknown("10 minutes"), Duration.minutes(10))
    assertSome(Duration.decodeUnknown("1 hour"), Duration.hours(1))
    assertSome(Duration.decodeUnknown("10 hours"), Duration.hours(10))
    assertSome(Duration.decodeUnknown("1 day"), Duration.days(1))
    assertSome(Duration.decodeUnknown("10 days"), Duration.days(10))
    assertSome(Duration.decodeUnknown("1 week"), Duration.weeks(1))
    assertSome(Duration.decodeUnknown("10 weeks"), Duration.weeks(10))

    assertSome(Duration.decodeUnknown("1.5 seconds"), Duration.seconds(1.5))
    assertSome(Duration.decodeUnknown("-1.5 seconds"), Duration.zero)

    assertSome(Duration.decodeUnknown([500, 123456789]), Duration.nanos(500123456789n))
    assertSome(Duration.decodeUnknown([-500, 123456789]), Duration.zero)
    assertSome(Duration.decodeUnknown([Infinity, 0]), Duration.infinity)
    assertSome(Duration.decodeUnknown([-Infinity, 0]), Duration.zero)
    assertSome(Duration.decodeUnknown([NaN, 0]), Duration.zero)
    assertSome(Duration.decodeUnknown([0, Infinity]), Duration.infinity)
    assertSome(Duration.decodeUnknown([0, -Infinity]), Duration.zero)
    assertSome(Duration.decodeUnknown([0, NaN]), Duration.zero)
    assertNone(Duration.decodeUnknown("1.5 secs"))
    assertNone(Duration.decodeUnknown(true))
    assertNone(Duration.decodeUnknown({}))
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

    deepStrictEqual(
      Duration.clamp("1 millis", {
        minimum: "2 millis",
        maximum: "3 millis"
      }),
      Duration.millis(2)
    )
  })

  it("equals", () => {
    assertTrue(pipe(Duration.hours(1), Duration.equals(Duration.minutes(60))))
    assertTrue(Duration.equals("2 seconds", "2 seconds"))
    assertFalse(Duration.equals("2 seconds", "3 seconds"))
  })

  it("between", () => {
    assertTrue(Duration.between(Duration.hours(1), {
      minimum: Duration.minutes(59),
      maximum: Duration.minutes(61)
    }))
    assertTrue(
      Duration.between(Duration.minutes(1), {
        minimum: Duration.seconds(59),
        maximum: Duration.seconds(61)
      })
    )

    assertTrue(Duration.between("1 minutes", {
      minimum: "59 seconds",
      maximum: "61 seconds"
    }))
  })

  it("divide", () => {
    assertSome(Duration.divide(Duration.minutes(1), 2), Duration.seconds(30))
    assertSome(Duration.divide(Duration.seconds(1), 3), Duration.nanos(333333333n))
    assertSome(Duration.divide(Duration.nanos(2n), 2), Duration.nanos(1n))
    assertSome(Duration.divide(Duration.nanos(1n), 3), Duration.zero)
    assertSome(Duration.divide(Duration.infinity, 2), Duration.infinity)
    assertSome(Duration.divide(Duration.zero, 2), Duration.zero)
    assertNone(Duration.divide(Duration.minutes(1), 0))
    assertNone(Duration.divide(Duration.minutes(1), -0))
    assertNone(Duration.divide(Duration.nanos(1n), 0))
    assertNone(Duration.divide(Duration.nanos(1n), -0))
    assertSome(Duration.divide(Duration.minutes(1), 0.5), Duration.minutes(2))
    assertSome(Duration.divide(Duration.minutes(1), 1.5), Duration.seconds(40))
    assertNone(Duration.divide(Duration.minutes(1), NaN))
    assertNone(Duration.divide(Duration.nanos(1n), 0.5))
    assertNone(Duration.divide(Duration.nanos(1n), 1.5))
    assertNone(Duration.divide(Duration.nanos(1n), NaN))

    assertSome(Duration.divide("1 minute", 2), Duration.seconds(30))
  })

  it("unsafeDivide", () => {
    deepStrictEqual(Duration.unsafeDivide(Duration.minutes(1), 2), Duration.seconds(30))
    deepStrictEqual(Duration.unsafeDivide(Duration.seconds(1), 3), Duration.nanos(333333333n))
    deepStrictEqual(Duration.unsafeDivide(Duration.nanos(2n), 2), Duration.nanos(1n))
    deepStrictEqual(Duration.unsafeDivide(Duration.nanos(1n), 3), Duration.zero)
    deepStrictEqual(Duration.unsafeDivide(Duration.infinity, 2), Duration.infinity)
    deepStrictEqual(Duration.unsafeDivide(Duration.zero, 2), Duration.zero)
    deepStrictEqual(Duration.unsafeDivide(Duration.minutes(1), 0), Duration.infinity)
    deepStrictEqual(Duration.unsafeDivide(Duration.minutes(1), -0), Duration.zero)
    deepStrictEqual(Duration.unsafeDivide(Duration.nanos(1n), 0), Duration.infinity)
    deepStrictEqual(Duration.unsafeDivide(Duration.nanos(1n), -0), Duration.zero)
    deepStrictEqual(Duration.unsafeDivide(Duration.minutes(1), 0.5), Duration.minutes(2))
    deepStrictEqual(Duration.unsafeDivide(Duration.minutes(1), 1.5), Duration.seconds(40))
    deepStrictEqual(Duration.unsafeDivide(Duration.minutes(1), NaN), Duration.zero)
    throws(() => Duration.unsafeDivide(Duration.nanos(1n), 0.5))
    throws(() => Duration.unsafeDivide(Duration.nanos(1n), 1.5))
    deepStrictEqual(Duration.unsafeDivide(Duration.nanos(1n), NaN), Duration.zero)

    deepStrictEqual(Duration.unsafeDivide("1 minute", 2), Duration.seconds(30))
  })

  it("times", () => {
    deepStrictEqual(Duration.times(Duration.seconds(1), 60), Duration.minutes(1))
    deepStrictEqual(Duration.times(Duration.nanos(2n), 10), Duration.nanos(20n))
    deepStrictEqual(Duration.times(Duration.seconds(Infinity), 60), Duration.seconds(Infinity))

    deepStrictEqual(Duration.times("1 seconds", 60), Duration.minutes(1))
  })

  it("sum", () => {
    deepStrictEqual(Duration.sum(Duration.seconds(30), Duration.seconds(30)), Duration.minutes(1))
    deepStrictEqual(Duration.sum(Duration.nanos(30n), Duration.nanos(30n)), Duration.nanos(60n))
    deepStrictEqual(Duration.sum(Duration.seconds(Infinity), Duration.seconds(30)), Duration.seconds(Infinity))
    deepStrictEqual(Duration.sum(Duration.seconds(30), Duration.seconds(Infinity)), Duration.seconds(Infinity))

    deepStrictEqual(Duration.sum("30 seconds", "30 seconds"), Duration.minutes(1))
  })

  it("subtract", () => {
    deepStrictEqual(Duration.subtract(Duration.seconds(30), Duration.seconds(10)), Duration.seconds(20))
    deepStrictEqual(Duration.subtract(Duration.seconds(30), Duration.seconds(30)), Duration.zero)
    deepStrictEqual(Duration.subtract(Duration.nanos(30n), Duration.nanos(10n)), Duration.nanos(20n))
    deepStrictEqual(Duration.subtract(Duration.nanos(30n), Duration.nanos(30n)), Duration.zero)
    deepStrictEqual(Duration.subtract(Duration.seconds(Infinity), Duration.seconds(30)), Duration.seconds(Infinity))
    deepStrictEqual(Duration.subtract(Duration.seconds(30), Duration.seconds(Infinity)), Duration.zero)

    deepStrictEqual(Duration.subtract("30 seconds", "10 seconds"), Duration.seconds(20))
  })

  it("greaterThan", () => {
    assertTrue(pipe(Duration.seconds(30), Duration.greaterThan(Duration.seconds(20))))
    assertFalse(pipe(Duration.seconds(30), Duration.greaterThan(Duration.seconds(30))))
    assertFalse(pipe(Duration.seconds(30), Duration.greaterThan(Duration.seconds(60))))

    assertTrue(pipe(Duration.nanos(30n), Duration.greaterThan(Duration.nanos(20n))))
    assertFalse(pipe(Duration.nanos(30n), Duration.greaterThan(Duration.nanos(30n))))
    assertFalse(pipe(Duration.nanos(30n), Duration.greaterThan(Duration.nanos(60n))))

    assertTrue(pipe(Duration.millis(1), Duration.greaterThan(Duration.nanos(1n))))

    assertFalse(Duration.greaterThan("2 seconds", "2 seconds"))
    assertTrue(Duration.greaterThan("3 seconds", "2 seconds"))
    assertFalse(Duration.greaterThan("2 seconds", "3 seconds"))
  })

  it("greaterThan - Infinity", () => {
    assertTrue(pipe(Duration.infinity, Duration.greaterThan(Duration.seconds(20))))
    assertFalse(pipe(Duration.seconds(-Infinity), Duration.greaterThan(Duration.infinity)))
    assertFalse(pipe(Duration.nanos(1n), Duration.greaterThan(Duration.infinity)))
  })

  it("greaterThanOrEqualTo", () => {
    assertTrue(pipe(Duration.seconds(30), Duration.greaterThanOrEqualTo(Duration.seconds(20))))
    assertTrue(pipe(Duration.seconds(30), Duration.greaterThanOrEqualTo(Duration.seconds(30))))
    assertFalse(pipe(Duration.seconds(30), Duration.greaterThanOrEqualTo(Duration.seconds(60))))

    assertTrue(pipe(Duration.nanos(30n), Duration.greaterThanOrEqualTo(Duration.nanos(20n))))
    assertTrue(pipe(Duration.nanos(30n), Duration.greaterThanOrEqualTo(Duration.nanos(30n))))
    assertFalse(pipe(Duration.nanos(30n), Duration.greaterThanOrEqualTo(Duration.nanos(60n))))

    assertTrue(Duration.greaterThanOrEqualTo("2 seconds", "2 seconds"))
    assertTrue(Duration.greaterThanOrEqualTo("3 seconds", "2 seconds"))
    assertFalse(Duration.greaterThanOrEqualTo("2 seconds", "3 seconds"))
  })

  it("lessThan", () => {
    assertTrue(pipe(Duration.seconds(20), Duration.lessThan(Duration.seconds(30))))
    assertFalse(pipe(Duration.seconds(30), Duration.lessThan(Duration.seconds(30))))
    assertFalse(pipe(Duration.seconds(60), Duration.lessThan(Duration.seconds(30))))

    assertTrue(pipe(Duration.nanos(20n), Duration.lessThan(Duration.nanos(30n))))
    assertFalse(pipe(Duration.nanos(30n), Duration.lessThan(Duration.nanos(30n))))
    assertFalse(pipe(Duration.nanos(60n), Duration.lessThan(Duration.nanos(30n))))

    assertTrue(pipe(Duration.nanos(1n), Duration.lessThan(Duration.millis(1))))

    assertFalse(Duration.lessThan("2 seconds", "2 seconds"))
    assertFalse(Duration.lessThan("3 seconds", "2 seconds"))
    assertTrue(Duration.lessThan("2 seconds", "3 seconds"))
  })

  it("lessThanOrEqualTo", () => {
    assertTrue(pipe(Duration.seconds(20), Duration.lessThanOrEqualTo(Duration.seconds(30))))
    assertTrue(pipe(Duration.seconds(30), Duration.lessThanOrEqualTo(Duration.seconds(30))))
    assertFalse(pipe(Duration.seconds(60), Duration.lessThanOrEqualTo(Duration.seconds(30))))

    assertTrue(pipe(Duration.nanos(20n), Duration.lessThanOrEqualTo(Duration.nanos(30n))))
    assertTrue(pipe(Duration.nanos(30n), Duration.lessThanOrEqualTo(Duration.nanos(30n))))
    assertFalse(pipe(Duration.nanos(60n), Duration.lessThanOrEqualTo(Duration.nanos(30n))))

    assertTrue(Duration.lessThanOrEqualTo("2 seconds", "2 seconds"))
    assertFalse(Duration.lessThanOrEqualTo("3 seconds", "2 seconds"))
    assertTrue(Duration.lessThanOrEqualTo("2 seconds", "3 seconds"))
  })

  it("String()", () => {
    strictEqual(String(Duration.infinity), `Duration(Infinity)`)
    strictEqual(String(Duration.nanos(10n)), `Duration(10ns)`)
    strictEqual(String(Duration.millis(2)), `Duration(2ms)`)
    strictEqual(String(Duration.millis(2.125)), `Duration(2ms 125000ns)`)
    strictEqual(String(Duration.seconds(2)), `Duration(2s)`)
    strictEqual(String(Duration.seconds(2.5)), `Duration(2s 500ms)`)
  })

  it("format", () => {
    strictEqual(Duration.format(Duration.infinity), `Infinity`)
    strictEqual(Duration.format(Duration.minutes(5)), `5m`)
    strictEqual(Duration.format(Duration.minutes(5.325)), `5m 19s 500ms`)
    strictEqual(Duration.format(Duration.hours(3)), `3h`)
    strictEqual(Duration.format(Duration.hours(3.11125)), `3h 6m 40s 500ms`)
    strictEqual(Duration.format(Duration.days(2)), `2d`)
    strictEqual(Duration.format(Duration.days(2.25)), `2d 6h`)
    strictEqual(Duration.format(Duration.weeks(1)), `7d`)
    strictEqual(Duration.format(Duration.zero), `0`)
  })

  it("format", () => {
    deepStrictEqual(Duration.parts(Duration.infinity), {
      days: Infinity,
      hours: Infinity,
      minutes: Infinity,
      seconds: Infinity,
      millis: Infinity,
      nanos: Infinity
    })

    deepStrictEqual(Duration.parts(Duration.minutes(5.325)), {
      days: 0,
      hours: 0,
      minutes: 5,
      seconds: 19,
      millis: 500,
      nanos: 0
    })

    deepStrictEqual(Duration.parts(Duration.minutes(3.11125)), {
      days: 0,
      hours: 0,
      minutes: 3,
      seconds: 6,
      millis: 675,
      nanos: 0
    })
  })

  it("toJSON", () => {
    deepStrictEqual(Duration.seconds(2).toJSON(), { _id: "Duration", _tag: "Millis", millis: 2000 })
  })

  it("toJSON/ non-integer millis", () => {
    deepStrictEqual(Duration.millis(1.5).toJSON(), { _id: "Duration", _tag: "Nanos", hrtime: [0, 1_500_000] })
  })

  it("toJSON/ nanos", () => {
    deepStrictEqual(Duration.nanos(5n).toJSON(), { _id: "Duration", _tag: "Nanos", hrtime: [0, 5] })
  })

  it("toJSON/ infinity", () => {
    deepStrictEqual(Duration.infinity.toJSON(), { _id: "Duration", _tag: "Infinity" })
  })

  it(`inspect`, () => {
    if (typeof window === "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { inspect } = require("node:util")
      deepStrictEqual(inspect(Duration.millis(1000)), inspect({ _id: "Duration", _tag: "Millis", millis: 1000 }))
    }
  })

  it("sum/ Infinity", () => {
    deepStrictEqual(Duration.sum(Duration.seconds(1), Duration.infinity), Duration.infinity)
  })

  it(".pipe()", () => {
    deepStrictEqual(Duration.seconds(1).pipe(Duration.sum(Duration.seconds(1))), Duration.seconds(2))
  })

  it("isDuration", () => {
    assertTrue(Duration.isDuration(Duration.millis(100)))
    assertFalse(Duration.isDuration(null))
  })

  it("zero", () => {
    deepStrictEqual(Duration.zero.value, { _tag: "Millis", millis: 0 })
  })

  it("infinity", () => {
    deepStrictEqual(Duration.infinity.value, { _tag: "Infinity" })
  })

  it("weeks", () => {
    assertTrue(Equal.equals(Duration.weeks(1), Duration.days(7)))
    assertFalse(Equal.equals(Duration.weeks(1), Duration.days(1)))
  })

  it("toMillis", () => {
    strictEqual(Duration.millis(1).pipe(Duration.toMillis), 1)
    strictEqual(Duration.nanos(1n).pipe(Duration.toMillis), 0.000001)
    strictEqual(Duration.infinity.pipe(Duration.toMillis), Infinity)

    strictEqual(Duration.toMillis("1 millis"), 1)
  })

  it("toSeconds", () => {
    strictEqual(Duration.millis(1).pipe(Duration.toSeconds), 0.001)
    strictEqual(Duration.nanos(1n).pipe(Duration.toSeconds), 1e-9)
    strictEqual(Duration.infinity.pipe(Duration.toSeconds), Infinity)

    strictEqual(Duration.toSeconds("1 seconds"), 1)
    strictEqual(Duration.toSeconds("3 seconds"), 3)
    strictEqual(Duration.toSeconds("3 minutes"), 180)
  })

  it("toNanos", () => {
    assertSome(Duration.nanos(1n).pipe(Duration.toNanos), 1n)
    assertNone(Duration.infinity.pipe(Duration.toNanos))
    assertSome(Duration.millis(1.0005).pipe(Duration.toNanos), 1_000_500n)
    assertSome(Duration.millis(100).pipe(Duration.toNanos), 100_000_000n)

    assertSome(Duration.toNanos("1 nanos"), 1n)
  })

  it("unsafeToNanos", () => {
    strictEqual(Duration.nanos(1n).pipe(Duration.unsafeToNanos), 1n)
    throws(() => Duration.infinity.pipe(Duration.unsafeToNanos))
    strictEqual(Duration.millis(1.0005).pipe(Duration.unsafeToNanos), 1_000_500n)
    strictEqual(Duration.millis(100).pipe(Duration.unsafeToNanos), 100_000_000n)

    strictEqual(Duration.unsafeToNanos("1 nanos"), 1n)
  })

  it("toHrTime", () => {
    deepStrictEqual(Duration.millis(1).pipe(Duration.toHrTime), [0, 1_000_000])
    deepStrictEqual(Duration.nanos(1n).pipe(Duration.toHrTime), [0, 1])
    deepStrictEqual(Duration.nanos(1_000_000_001n).pipe(Duration.toHrTime), [1, 1])
    deepStrictEqual(Duration.millis(1001).pipe(Duration.toHrTime), [1, 1_000_000])
    deepStrictEqual(Duration.infinity.pipe(Duration.toHrTime), [Infinity, 0])

    deepStrictEqual(Duration.toHrTime("1 millis"), [0, 1_000_000])
  })

  it("floor is 0", () => {
    deepStrictEqual(Duration.millis(-1), Duration.zero)
    deepStrictEqual(Duration.nanos(-1n), Duration.zero)
  })

  it("match", () => {
    const match = Duration.match({
      onMillis: () => "millis",
      onNanos: () => "nanos"
    })
    strictEqual(match(Duration.decode("100 millis")), "millis")
    strictEqual(match(Duration.decode("10 nanos")), "nanos")
    strictEqual(match(Duration.decode(Infinity)), "millis")

    strictEqual(match("100 millis"), "millis")
  })

  it("isFinite", () => {
    assertTrue(Duration.isFinite(Duration.millis(100)))
    assertTrue(Duration.isFinite(Duration.nanos(100n)))
    assertFalse(Duration.isFinite(Duration.infinity))
  })

  it("isZero", () => {
    assertTrue(Duration.isZero(Duration.zero))
    assertTrue(Duration.isZero(Duration.millis(0)))
    assertTrue(Duration.isZero(Duration.nanos(0n)))
    assertFalse(Duration.isZero(Duration.infinity))
    assertFalse(Duration.isZero(Duration.millis(1)))
    assertFalse(Duration.isZero(Duration.nanos(1n)))
  })

  it("toMinutes", () => {
    strictEqual(Duration.millis(60000).pipe(Duration.toMinutes), 1)
    strictEqual(Duration.nanos(60000000000n).pipe(Duration.toMinutes), 1)
    strictEqual(Duration.infinity.pipe(Duration.toMinutes), Infinity)

    strictEqual(Duration.toMinutes("1 minute"), 1)
    strictEqual(Duration.toMinutes("2 minutes"), 2)
    strictEqual(Duration.toMinutes("1 hour"), 60)
  })

  it("toHours", () => {
    strictEqual(Duration.millis(3_600_000).pipe(Duration.toHours), 1)
    strictEqual(Duration.nanos(3_600_000_000_000n).pipe(Duration.toHours), 1)
    strictEqual(Duration.infinity.pipe(Duration.toHours), Infinity)

    strictEqual(Duration.toHours("1 hour"), 1)
    strictEqual(Duration.toHours("2 hours"), 2)
    strictEqual(Duration.toHours("1 day"), 24)
  })

  it("toDays", () => {
    strictEqual(Duration.millis(86_400_000).pipe(Duration.toDays), 1)
    strictEqual(Duration.nanos(86_400_000_000_000n).pipe(Duration.toDays), 1)
    strictEqual(Duration.infinity.pipe(Duration.toDays), Infinity)

    strictEqual(Duration.toDays("1 day"), 1)
    strictEqual(Duration.toDays("2 days"), 2)
    strictEqual(Duration.toDays("1 week"), 7)
  })

  it("toWeeks", () => {
    strictEqual(Duration.millis(604_800_000).pipe(Duration.toWeeks), 1)
    strictEqual(Duration.nanos(604_800_000_000_000n).pipe(Duration.toWeeks), 1)
    strictEqual(Duration.infinity.pipe(Duration.toWeeks), Infinity)

    strictEqual(Duration.toWeeks("1 week"), 1)
    strictEqual(Duration.toWeeks("2 weeks"), 2)
    strictEqual(Duration.toWeeks("14 days"), 2)
  })

  it("formatIso", () => {
    assertSome(Duration.formatIso(Duration.zero), "PT0S")
    assertSome(Duration.formatIso(Duration.seconds(2)), "PT2S")
    assertSome(Duration.formatIso(Duration.minutes(5)), "PT5M")
    assertSome(Duration.formatIso(Duration.hours(3)), "PT3H")
    assertSome(Duration.formatIso(Duration.days(1)), "P1D")

    assertSome(Duration.formatIso(Duration.minutes(90)), "PT1H30M")
    assertSome(Duration.formatIso(Duration.hours(25)), "P1DT1H")
    assertSome(Duration.formatIso(Duration.days(7)), "P1W")
    assertSome(Duration.formatIso(Duration.days(10)), "P1W3D")

    assertSome(Duration.formatIso(Duration.millis(1500)), "PT1.5S")
    assertSome(Duration.formatIso(Duration.micros(1500n)), "PT0.0015S")
    assertSome(Duration.formatIso(Duration.nanos(1500n)), "PT0.0000015S")

    assertSome(
      Duration.formatIso(
        Duration.seconds(
          365 * 24 * 60 * 60 + // 1 year
            60 * 24 * 60 * 60 + // 2 months
            3 * 24 * 60 * 60 + // 3 days
            4 * 60 * 60 + // 4 hours
            5 * 60 + // 5 minutes
            6.789 // 6.789 seconds
        )
      ),
      "P1Y2M3DT4H5M6.789S"
    )

    assertSome(
      Duration.formatIso(
        Duration.days(1).pipe(
          Duration.sum(Duration.hours(2)),
          Duration.sum(Duration.minutes(30))
        )
      ),
      "P1DT2H30M"
    )

    assertSome(
      Duration.formatIso(
        Duration.hours(2).pipe(
          Duration.sum(Duration.minutes(30)),
          Duration.sum(Duration.millis(1500))
        )
      ),
      "PT2H30M1.5S"
    )

    assertSome(Duration.formatIso("1 day"), "P1D")
    assertSome(Duration.formatIso("90 minutes"), "PT1H30M")
    assertSome(Duration.formatIso("1.5 seconds"), "PT1.5S")

    assertNone(Duration.formatIso(Duration.infinity))
  })

  it("fromIso", () => {
    assertSome(Duration.fromIso("P1D"), Duration.days(1))
    assertSome(Duration.fromIso("PT1H"), Duration.hours(1))
    assertSome(Duration.fromIso("PT1M"), Duration.minutes(1))
    assertSome(Duration.fromIso("PT1.5S"), Duration.seconds(1.5))
    assertSome(Duration.fromIso("P1Y"), Duration.days(365))
    assertSome(Duration.fromIso("P1M"), Duration.days(30))
    assertSome(Duration.fromIso("P1W"), Duration.days(7))
    assertSome(Duration.fromIso("P1DT12H"), Duration.hours(36))
    assertSome(
      Duration.fromIso("P1Y2M3DT4H5M6.789S"),
      Duration.seconds(
        365 * 24 * 60 * 60 + // 1 year
          60 * 24 * 60 * 60 + // 2 months
          3 * 24 * 60 * 60 + // 3 days
          4 * 60 * 60 + // 4 hours
          5 * 60 + // 5 minutes
          6.789 // 6.789 seconds
      )
    )

    assertNone(Duration.fromIso("1D"))
    assertNone(Duration.fromIso("P1H"))
    assertNone(Duration.fromIso("PT1D"))
    assertNone(Duration.fromIso("P1.5D"))
    assertNone(Duration.fromIso("P1.5Y"))
    assertNone(Duration.fromIso("P1.5M"))
    assertNone(Duration.fromIso("PT1.5H"))
    assertNone(Duration.fromIso("PT1.5M"))
    assertNone(Duration.fromIso("PDT1H"))
    assertNone(Duration.fromIso("P1D2H"))
    assertNone(Duration.fromIso("P"))
    assertNone(Duration.fromIso("PT"))
    assertNone(Duration.fromIso("random string"))
    assertNone(Duration.fromIso("P1YT"))
    assertNone(Duration.fromIso("P1S"))
    assertNone(Duration.fromIso("P1DT1S1H"))
  })
})
