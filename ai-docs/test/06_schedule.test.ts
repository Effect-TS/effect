import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit } from "effect"
import { TestClock } from "effect/testing"
import { HttpError, productionRetrySchedule } from "../src/06_schedule/10_schedules.ts"

describe("06_schedule", () => {
  it.effect("productionRetrySchedule stops after five retries of a retryable error", () =>
    Effect.gen(function*() {
      const error = new HttpError({ message: "Service unavailable", status: 503, retryable: true })
      let attempts = 0
      const fiber = yield* Effect.suspend(() => {
        attempts++
        return Effect.fail(error)
      }).pipe(
        Effect.retry(productionRetrySchedule),
        Effect.forkChild
      )

      yield* TestClock.adjust("1 hour")

      assert.deepStrictEqual(fiber.pollUnsafe(), Exit.fail(error))
      assert.strictEqual(attempts, 6)
    }))
})
