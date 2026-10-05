import { describe, it } from "@effect/vitest"
import { assertTrue } from "@effect/vitest/utils"
import { Cron } from "effect"

describe("Cron", () => {
  it("next returns a future occurrence during the second DST fold hour", () => {
    // Cron.next (src/Cron.ts:759-773) searches for the next occurrence *after* the supplied date/time.
    // 02:15 +01:00 is the second 02:00 hour on 2024-10-27 in Europe/Berlin; the first 02:30 (+02:00) has
    // already passed, so the result must be strictly later than the input (test/Cron.test.ts:732 expects 03:30).
    const now = new Date("2024-10-27T02:15:00+01:00")
    const result = Cron.next(Cron.parseUnsafe("30 * * * *", "Europe/Berlin"), now)
    assertTrue(result.getTime() > now.getTime(), `${result.toISOString()} is not after ${now.toISOString()}`)
  })
})
