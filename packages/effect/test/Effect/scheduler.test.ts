import * as Array from "effect/Array"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Random from "effect/Random"
import * as Ref from "effect/Ref"
import * as Scheduler from "effect/Scheduler"
import * as it from "effect/test/utils/extend"
import * as fc from "fast-check"
import { assert, describe } from "vitest"

describe("Effect", () => {
  it.effect("matrix schedules according to priority", () =>
    Effect.gen(function*($) {
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
      yield* $(
        Effect.yieldNow(),
        Effect.withScheduler(scheduler)
      )
      assert.deepEqual(ps000, [0])
      yield* $(
        Effect.yieldNow({ priority: 50 }),
        Effect.withScheduler(scheduler)
      )
      assert.deepEqual(ps000, [0, 0])
      yield* $(
        Effect.yieldNow({ priority: 100 }),
        Effect.withScheduler(scheduler)
      )
      assert.deepEqual(ps100, [100])
      yield* $(
        Effect.yieldNow({ priority: 150 }),
        Effect.withScheduler(scheduler)
      )
      assert.deepEqual(ps100, [100, 100])
      yield* $(
        Effect.yieldNow({ priority: 200 }),
        Effect.withScheduler(scheduler)
      )
      assert.deepEqual(ps100, [100, 100])
      assert.deepEqual(ps200, [200])
      yield* $(
        Effect.yieldNow({ priority: 300 }),
        Effect.withScheduler(scheduler)
      )
      assert.deepEqual(ps100, [100, 100])
      assert.deepEqual(ps200, [200])
    }))

  describe("RandomScheduler", () => {
    it.effect("executes randomly", () =>
      Effect.gen(function*() {
        const execOrderRef = yield* Ref.make<Array<number>>([])

        const testEffect = (value: number) =>
          execOrderRef.pipe(
            Ref.update((x) => {
              x.push(value)
              return x
            })
          )

        yield* Effect.all(
          Array.makeBy(6, testEffect),
          { concurrency: "unbounded" }
        ).pipe(
          Effect.withScheduler(new Scheduler.RandomScheduler({ seed: 108 }))
        )

        const execOrder = yield* Ref.get(execOrderRef)

        assert.deepEqual(execOrder, [0, 5, 2, 4, 3, 1])
      }))

    it.it("respects priority", () =>
      fc.assert(fc.asyncProperty(
        fc.integer(),
        fc.integer(),
        fc.integer(),
        fc.integer({
          min: 1,
          max: 5
        }),
        (priority1, priority2, priority3, replicateCount) =>
          Effect.gen(function*() {
            const execOrderRef = yield* Ref.make<Array<number>>([])

            const createEffectWithPriority = (priority: number) =>
              Effect.yieldNow().pipe(
                Effect.andThen(
                  Ref.update(execOrderRef, (x) => {
                    x.push(priority)
                    return x
                  })
                ),
                Effect.withSchedulingPriority(priority)
              )
            const priorities = [priority1, priority2, priority3]
            const testEffects = yield* pipe(
              priorities,
              Array.map((x) => createEffectWithPriority(x)),
              Array.replicate(replicateCount),
              Array.flatten,
              Random.shuffle,
              Effect.andThen(Chunk.toReadonlyArray)
            )

            yield* Effect.all(testEffects, { concurrency: "unbounded" })
              .pipe(
                Effect.withScheduler(new Scheduler.RandomScheduler())
              )

            const execOrder = yield* Ref.get(execOrderRef)

            assert.equal(
              execOrder.length,
              priorities.length * replicateCount
            )

            assert.deepEqual(execOrder, [...execOrder].sort((a, b) => a - b))
          }).pipe(Effect.runPromise)
      )))
  })
})
