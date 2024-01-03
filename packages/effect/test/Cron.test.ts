import { assertFalse, assertTrue, deepStrictEqual } from "effect-test/util"
import * as Cron from "effect/Cron"
import * as Either from "effect/Either"
import { identity } from "effect/Function"
import * as ReadonlyArray from "effect/ReadonlyArray"
import { describe, it } from "vitest"

const _ = (input: string) => Either.getOrThrowWith(Cron.parse(input), identity)

describe("Cron", () => {
  it("parse", () => {
    // At 04:00 on every day-of-month from 8 through 14.
    deepStrictEqual(
      Cron.parse("0 4 8-14 * 0-6"),
      Either.right(Cron.make({
        minutes: [0],
        hours: [4],
        days: ReadonlyArray.range(8, 14),
        months: [],
        weekdays: []
      }))
    )
    // At 00:00 on day-of-month 1 and 15 and on Wednesday.
    deepStrictEqual(
      Cron.parse("0 0 1,15 * 3"),
      Either.right(Cron.make({
        minutes: [0],
        hours: [0],
        days: [1, 15],
        months: [],
        weekdays: [3]
      }))
    )
    // At 00:00 on day-of-month 1 and 15 and on Wednesday.
    deepStrictEqual(
      Cron.parse("23 0-20/2 * * *"),
      Either.right(Cron.make({
        minutes: [23],
        hours: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
        days: [],
        months: [],
        weekdays: []
      }))
    )
  })

  it("match", () => {
    assertTrue(Cron.match(_("5 0 * 8 *"), new Date("2024-08-01 00:05:00")))
    assertFalse(Cron.match(_("5 0 * 8 *"), new Date("2024-09-01 00:05:00")))
    assertFalse(Cron.match(_("5 0 * 8 *"), new Date("2024-08-01 01:05:00")))

    assertTrue(Cron.match(_("15 14 1 * *"), new Date("2024-02-01 14:15:00")))
    assertFalse(Cron.match(_("15 14 1 * *"), new Date("2024-02-01 15:15:00")))
    assertFalse(Cron.match(_("15 14 1 * *"), new Date("2024-02-02 14:15:00")))

    assertTrue(Cron.match(_("23 0-20/2 * * 0"), new Date("2024-01-07 00:23:00")))
    assertFalse(Cron.match(_("23 0-20/2 * * 0"), new Date("2024-01-07 03:23:00")))
    assertFalse(Cron.match(_("23 0-20/2 * * 0"), new Date("2024-01-08 00:23:00")))

    assertTrue(Cron.match(_("5 4 * * SUN"), new Date("2024-01-07 04:05:00")))
    assertFalse(Cron.match(_("5 4 * * SUN"), new Date("2024-01-08 04:05:00")))
    assertFalse(Cron.match(_("5 4 * * SUN"), new Date("2025-01-07 04:05:00")))

    assertTrue(Cron.match(_("5 4 * DEC SUN"), new Date("2024-12-01 04:05:00")))
    assertFalse(Cron.match(_("5 4 * DEC SUN"), new Date("2024-12-01 04:06:00")))
    assertFalse(Cron.match(_("5 4 * DEC SUN"), new Date("2024-12-02 04:05:00")))
  })
})
