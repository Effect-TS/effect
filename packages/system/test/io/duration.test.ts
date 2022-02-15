import { List } from "../../src/collection/immutable/List"
import { Duration } from "../../src/data/Duration"

describe("Duration", () => {
  describe("make a Duration from positive millis and check that:", () => {
    it("the Duration is finite", () => {
      const duration = Duration(1)

      expect(duration).not.toEqual(Duration.Infinity)
    })

    it("multiplying with a negative factor returns Zero", () => {
      const duration = Duration(1) * -1.0

      expect(duration).toEqual(Duration.Zero)
    })

    it("it identifies as 'zero'", () => {
      const duration = Duration(0)

      expect(duration).toEqual(Duration.Zero)
    })

    it("it knows its length in ms", () => {
      const duration = Duration(123)

      expect(duration.milliseconds).toBe(123)
    })

    it("max(1 ms, 2 ms) is 2 ms", () => {
      const duration = Duration(1).max(Duration(2))

      expect(duration).toEqual(Duration(2))
    })

    it("min(1 ms, 2 ms) is 1 ms", () => {
      const duration = Duration(1).min(Duration(2))

      expect(duration).toEqual(Duration(1))
    })

    it("max(2 ms, 1 ms) is 2 ms", () => {
      const duration = Duration(2).max(Duration(1))

      expect(duration).toEqual(Duration(2))
    })

    it("min(2 ms, 1 ms) is 1 ms", () => {
      const duration = Duration(2).min(Duration(1))

      expect(duration).toEqual(Duration(1))
    })

    it("10 ms + 20 ms = 30 ms", () => {
      const duration = Duration(10) + Duration(20)

      expect(duration).toEqual(Duration(30))
    })

    it("10 ms * NaN = Infinity", () => {
      const duration = Duration(10) * NaN

      expect(duration).toEqual(Duration.Infinity)
    })

    it("10 ms compared to Infinity is -1", () => {
      const result = Duration(10) < Duration.Infinity

      expect(result).toBe(true)
    })

    it("10 ms compared to 10 ms is 0", () => {
      expect(Duration(10) < Duration(10)).toBe(false)
      expect(Duration(10) > Duration(10)).toBe(false)
    })

    it("+ with positive overflow results in Infinity", () => {
      const duration = Duration(Number.MAX_SAFE_INTEGER - 1) + Duration(42)

      expect(duration).toEqual(Duration.Infinity)
    })

    it("* with negative duration results in zero", () => {
      const duration = Duration(42) * -7

      expect(duration).toEqual(Duration.Zero)
    })

    it("* with overflow results in Infinity", () => {
      const duration = Duration(Number.MAX_VALUE) * 3

      expect(duration).toEqual(Duration.Infinity)
    })

    it("* with factor equal to 0 results in zero", () => {
      const duration = Duration(42) * 0

      expect(duration).toEqual(Duration.Zero)
    })

    it("* with positive factor less than 1 results in finite Duration", () => {
      const duration = Duration(42) * 0.5

      expect(duration).toEqual(Duration(21))
    })

    it("* with factor equal to 1 results in finite Duration in case of small duration", () => {
      const duration = Duration(42) * 1

      expect(duration).toEqual(Duration(42))
    })

    it("* with factor equal to 1 results in finite Duration in case of large duration", () => {
      const duration = Duration(Number.MAX_SAFE_INTEGER) * 1

      expect(duration).toEqual(Duration(Number.MAX_SAFE_INTEGER))
    })

    it("* results in finite Duration if the multiplication result is close to the max finite duration value", () => {
      const factor = 1.5
      const millis = Math.round(Number.MAX_VALUE / 1.9)
      const duration = Duration(millis) * factor

      expect(duration).not.toEqual(Duration.Infinity)
    })

    it("durations can be accumulated", () => {
      const durations = List(
        Duration.fromSeconds(1),
        Duration.fromSeconds(2),
        Duration.fromSeconds(3)
      )
      const duration = durations.reduce(Duration.Zero, (acc, curr) => acc + curr)

      expect(duration).toEqual(Duration.fromSeconds(6))
    })
  })

  describe("make a Duration from negative nanos and check that:", () => {
    it("the Duration is Zero", () => {
      const duration = Duration(-1)

      expect(duration).toEqual(Duration.Zero)
    })
  })

  describe("Take Infinity and check that:", () => {
    // it("toMillis returns Long.MaxValue nanoseconds in milliseconds", () => {
    //   assert(Duration.Infinity.toMillis)(equalTo(Long.MaxValue / 1000000))
    // })

    // it("toNanos returns Long.MaxValue nanoseconds", () => {
    //   assert(Duration.Infinity.toNanos)(equalTo(Long.MaxValue))
    // })

    it("Infinity + Infinity = Infinity", () => {
      const duration = Duration.Infinity + Duration.Infinity

      expect(duration).toEqual(Duration.Infinity)
    })

    it("Infinity + 1 ms = Infinity", () => {
      const duration = Duration.Infinity + Duration(1)

      expect(duration).toEqual(Duration.Infinity)
    })

    it("1 ns + Infinity = Infinity", () => {
      const duration = Duration(1) + Duration.Infinity

      expect(duration).toEqual(Duration.Infinity)
    })

    it("Infinity * 10 = Infinity", () => {
      const duration = Duration.Infinity * 10

      expect(duration).toEqual(Duration.Infinity)
    })

    it("Infinity compared to Infinity is 0", () => {
      expect(Duration.Infinity < Duration.Infinity).toBe(false)
      expect(Duration.Infinity > Duration.Infinity).toBe(false)
    })

    it("Infinity compared to 1 ms is 1", () => {
      expect(Duration.Infinity < Duration(1)).toBe(false)
      expect(Duration.Infinity > Duration(1)).toBe(true)
    })

    it("Infinity * -10 = Zero", () => {
      const duration = Duration.Infinity * -10

      expect(duration).toEqual(Duration.Zero)
    })

    it("Infinity * 0 = Zero", () => {
      const duration = Duration.Infinity * 0

      expect(duration).toEqual(Duration.Zero)
    })
  })

  describe("Check multiplication with finite durations:", () => {
    it("Zero multiplied with zero", () => {
      const duration = Duration.Zero * 0

      expect(duration).toEqual(Duration.Zero)
    })

    it("Zero multiplied with one", () => {
      const duration = Duration.Zero * 0

      expect(duration).toEqual(Duration.Zero)
    })

    it("one second multiplied with 60", () => {
      const duration = Duration.fromSeconds(1) * 60

      expect(duration).toEqual(Duration.fromMinutes(1))
    })
  })
})
