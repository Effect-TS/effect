import { nextDay } from "@effect/core/io/Schedule/operations/_internal/time"
import { runCollect, runManually } from "@effect/core/test/io/Schedule/test-utils"

function roundToNearestHour(date: Date): number {
  date.setMinutes(date.getMinutes() + 30)
  date.setMinutes(0, 0, 0)
  return date.getMilliseconds()
}

describe.concurrent("Schedule", () => {
  describe.concurrent("cron-like scheduling - repeats at point of time (minute of hour, day of week, ...)", () => {
    it.effect("recur at 01 second of each minute", () =>
      Do(($) => {
        const originOffset = new Date(new Date(new Date().setMinutes(0)).setSeconds(0))
          .setMilliseconds(0)

        const inTimeSecondMillis = new Date(new Date(originOffset).setSeconds(1)).setMilliseconds(1)
        const inTimeSecond = new Date(originOffset).setSeconds(1)
        const beforeTime = new Date(originOffset).setSeconds(0)
        const afterTime = new Date(originOffset).setSeconds(3)

        const input = List(inTimeSecondMillis, inTimeSecond, beforeTime, afterTime)
          .map((n) => Tuple(n, undefined))

        const result = $(
          runManually(Schedule.secondOfMinute(1), input)
            .map((output) => output.get(0).map((tuple) => tuple.get(0)))
        )

        const expected = new Date(new Date(originOffset).setSeconds(1))
        const inTimeSecondExpected = new Date(expected).setMinutes(expected.getMinutes() + 1)
        const beforeTimeExpected = new Date(expected).setMinutes(expected.getMinutes() + 2)
        const afterTimeExpected = new Date(expected).setMinutes(expected.getMinutes() + 3)
        const expectedOutput = List(
          inTimeSecondMillis,
          inTimeSecondExpected,
          beforeTimeExpected,
          afterTimeExpected
        )

        assert.isTrue(result == expectedOutput)
      }))

    it.effect("throw IllegalArgumentException on invalid `second` argument of `secondOfMinute`", () =>
      Do(($) => {
        const input = List(Date.now())
        const exit = $(runCollect(Schedule.secondOfMinute(60), input).exit)
        assert.isTrue(
          exit.isFailure() && exit.cause.isDieType() &&
            exit.cause.value instanceof IllegalArgumentException &&
            exit.cause.value.message ==
              "Invalid argument in: secondOfMinute(60). Must be in range 0...59"
        )
      }))

    it.effect("recur at 01 minute of each hour", () =>
      Do(($) => {
        const originOffset = new Date(new Date(new Date().setHours(0)).setSeconds(0))
          .setMilliseconds(0)

        const inTimeMinuteMillis = new Date(new Date(originOffset).setMinutes(1)).setMilliseconds(1)
        const inTimeMinute = new Date(originOffset).setMinutes(1)
        const beforeTime = new Date(originOffset).setMinutes(0)
        const afterTime = new Date(originOffset).setMinutes(3)

        const input = List(inTimeMinuteMillis, inTimeMinute, beforeTime, afterTime)
          .map((n) => Tuple(n, undefined))

        const result = $(
          runManually(Schedule.minuteOfHour(1), input)
            .map((output) => output.get(0).map((tuple) => tuple.get(0)))
        )

        const expected = new Date(new Date(originOffset).setMinutes(1))
        const inTimeMinuteExpected = new Date(expected).setHours(expected.getHours() + 1)
        const beforeTimeExpected = new Date(expected).setHours(expected.getHours() + 2)
        const afterTimeExpected = new Date(expected).setHours(expected.getHours() + 3)
        const expectedOutput = List(
          inTimeMinuteMillis,
          inTimeMinuteExpected,
          beforeTimeExpected,
          afterTimeExpected
        )

        assert.isTrue(result == expectedOutput)
      }))

    it.effect("throw IllegalArgumentException on invalid `minute` argument of `minuteOfHour`", () =>
      Do(($) => {
        const input = List(Date.now())
        const exit = $(runCollect(Schedule.minuteOfHour(60), input).exit)
        assert.isTrue(
          exit.isFailure() && exit.cause.isDieType() &&
            exit.cause.value instanceof IllegalArgumentException &&
            exit.cause.value.message ==
              "Invalid argument in: minuteOfHour(60). Must be in range 0...59"
        )
      }))

    it.effect("recur at 01 hour of each day", () =>
      Do(($) => {
        const originOffset = roundToNearestHour(new Date())

        const inTimeHourSecond = new Date(new Date(originOffset).setHours(1)).setSeconds(1)
        const inTimeHour = new Date(originOffset).setHours(1)
        const beforeTime = new Date(originOffset).setHours(0)
        const afterTime = new Date(originOffset).setHours(3)

        const input = List(inTimeHourSecond, inTimeHour, beforeTime, afterTime)
          .map((n) => Tuple(n, undefined))

        const result = $(
          runManually(Schedule.hourOfDay(1), input)
            .map((output) => output.get(0).map((tuple) => tuple.get(0)))
        )

        const expected = new Date(new Date(originOffset).setHours(1))
        const inTimeHourExpected = new Date(expected).setDate(expected.getDate() + 1)
        const beforeTimeExpected = new Date(expected).setDate(expected.getDate() + 2)
        const afterTimeExpected = new Date(expected).setDate(expected.getDate() + 3)
        const expectedOutput = List(
          inTimeHourSecond,
          inTimeHourExpected,
          beforeTimeExpected,
          afterTimeExpected
        )

        assert.isTrue(result == expectedOutput)
      }))

    it.effect("throw IllegalArgumentException on invalid `hour` argument of `hourOfDay`", () =>
      Do(($) => {
        const input = List(Date.now())
        const exit = $(runCollect(Schedule.hourOfDay(24), input).exit)
        assert.isTrue(
          exit.isFailure() && exit.cause.isDieType() &&
            exit.cause.value instanceof IllegalArgumentException &&
            exit.cause.value.message ==
              "Invalid argument in: hourOfDay(24). Must be in range 0...23"
        )
      }))

    it.effect("recur at Tuesday of each week", () =>
      Do(($) => {
        const originOffset = new Date().setUTCHours(0, 0, 0, 0)

        const tuesdayHour = new Date(nextDay(originOffset, 2)).setHours(1)
        const tuesday = nextDay(originOffset, 2)
        const monday = nextDay(originOffset, 1)
        const wednesday = nextDay(originOffset, 3)

        const input = List(tuesdayHour, tuesday, monday, wednesday)
          .map((n) => Tuple(n, undefined))

        const result = $(
          runManually(Schedule.dayOfWeek(2), input)
            .map((output) => output.get(0).map((tuple) => tuple.get(0)))
        )

        const expectedTuesday = new Date(nextDay(originOffset, 2))
        const tuesdayExpected = new Date(expectedTuesday).setDate(expectedTuesday.getDate() + 7)
        const mondayExpected = new Date(expectedTuesday).setDate(expectedTuesday.getDate() + 14)
        const wednesdayExpected = new Date(expectedTuesday).setDate(expectedTuesday.getDate() + 21)
        const expectedOutput = List(
          tuesdayHour,
          tuesdayExpected,
          mondayExpected,
          wednesdayExpected
        )

        assert.isTrue(result == expectedOutput)
      }))

    it.effect("throw IllegalArgumentException on invalid `day` argument of `dayOfWeek`", () =>
      Do(($) => {
        const input = List(Date.now())
        const exit = $(runCollect(Schedule.dayOfWeek(8), input).exit)
        assert.isTrue(
          exit.isFailure() && exit.cause.isDieType() &&
            exit.cause.value instanceof IllegalArgumentException &&
            exit.cause.value.message ==
              "Invalid argument in: dayOfWeek(8). Must be in range 1 (Monday)...7 (Sunday)"
        )
      }))

    it.effect("recur in the 2nd day of each month", () =>
      Do(($) => {
        const originOffset = new Date(2020, 0, 1, 0, 0, 0).getTime()

        const inTimeDate1 = new Date(new Date(originOffset).setDate(2)).setHours(1)
        const inTimeDate2 = new Date(originOffset).setDate(2)
        const before = new Date(originOffset).setDate(1)
        const after = new Date(originOffset).setDate(2)

        const input = List(inTimeDate1, inTimeDate2, before, after).map((n) => Tuple(n, undefined))

        const result = $(
          runManually(Schedule.dayOfMonth(2), input)
            .map((output) => output.get(0).map((tuple) => tuple.get(0)))
        )

        const expectedBefore = new Date(new Date(originOffset).setDate(2))
        const inTimeDate2Expected = new Date(expectedBefore).setMonth(expectedBefore.getMonth() + 1)
        const beforeExpected = new Date(expectedBefore).setMonth(expectedBefore.getMonth() + 2)
        const afterExpected = new Date(expectedBefore).setMonth(expectedBefore.getMonth() + 3)
        const expectedOutput = List(
          inTimeDate1,
          inTimeDate2Expected,
          beforeExpected,
          afterExpected
        )

        assert.isTrue(result == expectedOutput)
      }))

    it.effect("recur only in months containing valid number of days", () =>
      Do(($) => {
        const originOffset = new Date(2020, 0, 31, 0, 0, 0).getTime()

        const input = List(originOffset).map((n) => Tuple(n, undefined))

        const result = $(
          runManually(Schedule.dayOfMonth(30), input)
            .map((output) => output.get(0).map((tuple) => tuple.get(0)))
        )

        const expected = List(new Date(originOffset).setMonth(2, 30))

        assert.isTrue(result == expected)
      }))

    it.effect("throw IllegalArgumentException on invalid `day` argument of `dayOfMonth`", () =>
      Do(($) => {
        const input = List(Date.now())
        const exit = $(runCollect(Schedule.dayOfMonth(32), input).exit)
        assert.isTrue(
          exit.isFailure() && exit.cause.isDieType() &&
            exit.cause.value instanceof IllegalArgumentException &&
            exit.cause.value.message ==
              "Invalid argument in: dayOfMonth(32). Must be in range 1...31"
        )
      }))
  })
})
