import { deepStrictEqual } from "effect-test/util"
import * as Cron from "effect/Cron"
import * as Either from "effect/Either"
import { describe, it } from "vitest"
import { ReadonlyArray } from "../src/index.js"

describe("Cron", () => {
  it("parse", () => {
    // At 04:00 on every day-of-month from 8 through 14.
    deepStrictEqual(
      Cron.parse("0 4 8-14 * *"),
      Either.right(Cron.make({
        minutes: [0],
        hours: [4],
        days: ReadonlyArray.range(8, 14),
        months: ReadonlyArray.range(1, 12),
        weekdays: ReadonlyArray.range(0, 6)
      }))
    )
    // At 00:00 on day-of-month 1 and 15 and on Wednesday.
    deepStrictEqual(
      Cron.parse("0 0 1,15 * 3"),
      Either.right(Cron.make({
        minutes: [0],
        hours: [0],
        days: [1, 15],
        months: ReadonlyArray.range(1, 12),
        weekdays: [3]
      }))
    )
    // At 00:00 on day-of-month 1 and 15 and on Wednesday.
    deepStrictEqual(
      Cron.parse("23 0-20/2 * * *"),
      Either.right(Cron.make({
        minutes: [23],
        hours: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
        days: ReadonlyArray.range(1, 31),
        months: ReadonlyArray.range(1, 12),
        weekdays: ReadonlyArray.range(0, 6)
      }))
    )
  })
})
