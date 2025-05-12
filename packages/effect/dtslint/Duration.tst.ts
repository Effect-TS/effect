import type { Option } from "effect"
import { Duration } from "effect"
import { describe, expect, it } from "tstyche"

describe("Duration", () => {
  it("decode", () => {
    expect(Duration.decode(100)).type.toBe<Duration.Duration>()
    expect(Duration.decode(10n)).type.toBe<Duration.Duration>()
    expect(Duration.decode("1 nano")).type.toBe<Duration.Duration>()
    expect(Duration.decode("10 nanos")).type.toBe<Duration.Duration>()
    expect(Duration.decode("1 micro")).type.toBe<Duration.Duration>()
    expect(Duration.decode("10 micros")).type.toBe<Duration.Duration>()
    expect(Duration.decode("1 milli")).type.toBe<Duration.Duration>()
    expect(Duration.decode("10 millis")).type.toBe<Duration.Duration>()
    expect(Duration.decode("1 second")).type.toBe<Duration.Duration>()
    expect(Duration.decode("10 seconds")).type.toBe<Duration.Duration>()
    expect(Duration.decode("1 minute")).type.toBe<Duration.Duration>()
    expect(Duration.decode("10 minutes")).type.toBe<Duration.Duration>()
    expect(Duration.decode("1 hour")).type.toBe<Duration.Duration>()
    expect(Duration.decode("10 hours")).type.toBe<Duration.Duration>()
    expect(Duration.decode("1 day")).type.toBe<Duration.Duration>()
    expect(Duration.decode("10 days")).type.toBe<Duration.Duration>()

    expect(Duration.decode).type.not.toBeCallableWith("10 unknown")
  })

  it("toMillis", () => {
    expect(Duration.toMillis("1 millis")).type.toBe<number>()
  })

  it("toNanos", () => {
    expect(Duration.toNanos("1 millis")).type.toBe<Option.Option<bigint>>()
  })

  it("unsafeToNanos", () => {
    expect(Duration.unsafeToNanos("1 millis")).type.toBe<bigint>()
  })

  it("toHrTime", () => {
    expect(Duration.toHrTime("1 millis")).type.toBe<[seconds: number, nanos: number]>()
  })

  it("match", () => {
    expect(Duration.match("100 millis", {
      onMillis: (n) => {
        expect(n).type.toBe<number>()
        return "millis"
      },
      onNanos: (bi) => {
        expect(bi).type.toBe<bigint>()
        return "nanos"
      }
    })).type.toBe<string>()
  })

  it("between", () => {
    expect(Duration.between("1 minutes", { minimum: "59 seconds", maximum: "61 seconds" })).type.toBe<boolean>()
  })

  it("min", () => {
    expect(Duration.min("1 minutes", "2 millis")).type.toBe<Duration.Duration>()
  })

  it("max", () => {
    expect(Duration.max("1 minutes", "2 millis")).type.toBe<Duration.Duration>()
  })

  it("clamp", () => {
    expect(Duration.clamp("1 millis", { minimum: "2 millis", maximum: "3 millis" })).type.toBe<Duration.Duration>()
  })

  it("divide", () => {
    expect(Duration.divide("1 seconds", 2)).type.toBe<Option.Option<Duration.Duration>>()
  })

  it("unsafeDivide", () => {
    expect(Duration.unsafeDivide("1 seconds", 2)).type.toBe<Duration.Duration>()
  })

  it("times", () => {
    expect(Duration.times("1 seconds", 60)).type.toBe<Duration.Duration>()
  })

  it("sum", () => {
    expect(Duration.sum("30 seconds", "30 seconds")).type.toBe<Duration.Duration>()
  })

  it("greaterThanOrEqualTo", () => {
    expect(Duration.greaterThanOrEqualTo("2 seconds", "2 seconds")).type.toBe<boolean>()
  })

  it("greaterThan", () => {
    expect(Duration.greaterThan("2 seconds", "2 seconds")).type.toBe<boolean>()
  })

  it("lessThanOrEqualTo", () => {
    expect(Duration.lessThanOrEqualTo("2 seconds", "2 seconds")).type.toBe<boolean>()
  })

  it("lessThan", () => {
    expect(Duration.lessThan("2 seconds", "2 seconds")).type.toBe<boolean>()
  })

  it("equals", () => {
    expect(Duration.equals("2 seconds", "2 seconds")).type.toBe<boolean>()
  })
})
