import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Scheduler from "effect/Scheduler"

describe("Effect", () => {
  it.effect("matrix schedules according to priority", () =>
    Effect.gen(function*() {
      const ps000: Array<number> = []
      const ps100: Array<number> = []
      const ps200: Array<number> = []
      const scheduler = Scheduler.makeMatrix(
        [
          0,
          Scheduler.makeBatched((runBatch) => {
            ps000.push(0)
            setTimeout(runBatch, 0)
          })
        ],
        [
          100,
          Scheduler.makeBatched((runBatch) => {
            ps100.push(100)
            setTimeout(runBatch, 0)
          })
        ],
        [
          200,
          Scheduler.makeBatched((runBatch) => {
            ps200.push(200)
            setTimeout(runBatch, 0)
          })
        ],
        [
          300,
          Scheduler.makeBatched((runBatch) => {
            setTimeout(runBatch, 0)
          })
        ]
      )
      yield* pipe(
        Effect.yieldNow(),
        Effect.withScheduler(scheduler)
      )
      deepStrictEqual(ps000, [0])
      yield* pipe(
        Effect.yieldNow({ priority: 50 }),
        Effect.withScheduler(scheduler)
      )
      deepStrictEqual(ps000, [0, 0])
      yield* pipe(
        Effect.yieldNow({ priority: 100 }),
        Effect.withScheduler(scheduler)
      )
      deepStrictEqual(ps100, [100])
      yield* pipe(
        Effect.yieldNow({ priority: 150 }),
        Effect.withScheduler(scheduler)
      )
      deepStrictEqual(ps100, [100, 100])
      yield* pipe(
        Effect.yieldNow({ priority: 200 }),
        Effect.withScheduler(scheduler)
      )
      deepStrictEqual(ps100, [100, 100])
      deepStrictEqual(ps200, [200])
      yield* pipe(
        Effect.yieldNow({ priority: 300 }),
        Effect.withScheduler(scheduler)
      )
      deepStrictEqual(ps100, [100, 100])
      deepStrictEqual(ps200, [200])
    }))
})
