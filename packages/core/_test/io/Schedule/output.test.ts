import { checkDelays, checkRepetitions } from "@effect/core/test/io/Schedule/test-utils"

describe.concurrent("Schedule", () => {
  describe.concurrent("output values", () => {
    describe.concurrent("delays", () => {
      it.effect("duration", () =>
        Do(($) => {
          const result = $(checkDelays(Schedule.duration((1).seconds)))
          const { tuple: [actual, expected] } = result
          assert.isTrue(actual == expected)
        }))

      it.effect("exponential", () =>
        Do(($) => {
          const result = $(checkDelays(Schedule.exponential((1).seconds)))
          const { tuple: [actual, expected] } = result
          assert.isTrue(actual == expected)
        }))

      it.effect("fibonacci", () =>
        Do(($) => {
          const result = $(checkDelays(Schedule.fibonacci((1).seconds)))
          const { tuple: [actual, expected] } = result
          assert.isTrue(actual == expected)
        }))

      it.effect("fromDuration", () =>
        Do(($) => {
          const result = $(checkDelays(Schedule.fromDuration((1).seconds)))
          const { tuple: [actual, expected] } = result
          assert.isTrue(actual == expected)
        }))

      it.effect("fromDurations", () =>
        Do(($) => {
          const result = $(
            checkDelays(Schedule.fromDurations((1).seconds, (2).seconds, (3).seconds, (4).seconds))
          )
          const { tuple: [actual, expected] } = result
          assert.isTrue(actual == expected)
        }))

      it.effect("linear", () =>
        Do(($) => {
          const result = $(checkDelays(Schedule.linear((1).seconds)))
          const { tuple: [actual, expected] } = result
          assert.isTrue(actual == expected)
        }))
    })

    describe.concurrent("repetitions", () => {
      it("forever", () =>
        Do(($) => {
          const result = $(checkRepetitions(Schedule.repeatForever))
          const { tuple: [actual, expected] } = result
          assert.isTrue(actual == expected)
        }).unsafeRunPromise())

      it("count", () =>
        Do(($) => {
          const result = $(checkRepetitions(Schedule.count))
          const { tuple: [actual, expected] } = result
          assert.isTrue(actual == expected)
        }).unsafeRunPromise())

      it("dayOfMonth", () =>
        Do(($) => {
          const result = $(checkRepetitions(Schedule.dayOfMonth(1)))
          const { tuple: [actual, expected] } = result
          assert.isTrue(actual == expected)
        }).unsafeRunPromise())

      it("dayOfWeek", () =>
        Do(($) => {
          const result = $(checkRepetitions(Schedule.dayOfWeek(1)))
          const { tuple: [actual, expected] } = result
          assert.isTrue(actual == expected)
        }).unsafeRunPromise())

      it("hourOfDay", () =>
        Do(($) => {
          const result = $(checkRepetitions(Schedule.hourOfDay(1)))
          const { tuple: [actual, expected] } = result
          assert.isTrue(actual == expected)
        }).unsafeRunPromise())

      it("minuteOfHour", () =>
        Do(($) => {
          const result = $(checkRepetitions(Schedule.minuteOfHour(1)))
          const { tuple: [actual, expected] } = result
          assert.isTrue(actual == expected)
        }).unsafeRunPromise())

      it("secondOfMinute", () =>
        Do(($) => {
          const result = $(checkRepetitions(Schedule.secondOfMinute(1)))
          const { tuple: [actual, expected] } = result
          assert.isTrue(actual == expected)
        }).unsafeRunPromise())

      it("fixed", () =>
        Do(($) => {
          const result = $(checkRepetitions(Schedule.fixed((1).seconds)))
          const { tuple: [actual, expected] } = result
          assert.isTrue(actual == expected)
        }).unsafeRunPromise())

      it("repeatForever", () =>
        Do(($) => {
          const result = $(checkRepetitions(Schedule.repeatForever))
          const { tuple: [actual, expected] } = result
          assert.isTrue(actual == expected)
        }).unsafeRunPromise())

      it("recurs", () =>
        Do(($) => {
          const result = $(checkRepetitions(Schedule.recurs(2)))
          const { tuple: [actual, expected] } = result
          assert.isTrue(actual == expected)
        }).unsafeRunPromise())

      it("spaced", () =>
        Do(($) => {
          const result = $(checkRepetitions(Schedule.spaced((1).seconds)))
          const { tuple: [actual, expected] } = result
          assert.isTrue(actual == expected)
        }).unsafeRunPromise())

      it("windowed", () =>
        Do(($) => {
          const result = $(checkRepetitions(Schedule.windowed((1).seconds)))
          const { tuple: [actual, expected] } = result
          assert.isTrue(actual == expected)
        }).unsafeRunPromise())
    })
  })
})
