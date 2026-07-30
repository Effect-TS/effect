import { assert, describe, it } from "@effect/vitest"
import { Activity } from "@effect/workflow"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as TestClock from "effect/TestClock"

describe("Activity", () => {
  it.effect("bounds retries after interruption", () =>
    Effect.gen(function*() {
      let attempts = 0
      const activity = Activity.make({
        name: "interrupting",
        execute: Effect.suspend(() => {
          attempts++
          return Effect.interrupt
        })
      })

      const execute = activity.execute as Effect.Effect<void>
      const fiber = yield* execute.pipe(Effect.exit, Effect.fork)
      yield* TestClock.adjust("1 day")
      const exit = yield* Fiber.join(fiber)

      assert(Exit.isFailure(exit))
      assert.strictEqual(attempts, 11)
      assert.include(String(Cause.squash(exit.cause)), "retry attempts exhausted")
    }))
})
