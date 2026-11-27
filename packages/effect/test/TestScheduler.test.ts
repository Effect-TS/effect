import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Ref from "effect/Ref"
import * as TestClock from "effect/testing/TestClock"
import * as TestScheduler from "effect/testing/TestScheduler"

describe("TestScheduler", () => {
  it.effect("surfaces a lost update race and replays it deterministically by seed", () =>
    Effect.gen(function*() {
      const increment = Effect.fnUntraced(function*(ref: Ref.Ref<number>) {
        const n = yield* Ref.get(ref)
        yield* Ref.set(ref, n + 1)
      })

      const program = Effect.gen(function*() {
        const ref = yield* Ref.make(0)
        yield* Effect.all([increment(ref), increment(ref)], { concurrency: "unbounded" })
        return yield* Ref.get(ref)
      })

      let failingSeed: number | undefined = undefined
      for (let seed = 1; seed <= 200; seed++) {
        const result = yield* program.pipe(Effect.provide(TestScheduler.layer({ seed })))
        if (result === 1) {
          failingSeed = seed
          break
        }
      }

      assert.isDefined(failingSeed)

      const replayLayer = TestScheduler.layer({ seed: failingSeed })
      for (let i = 0; i < 5; i++) {
        assert.strictEqual(yield* program.pipe(Effect.provide(replayLayer)), 1)
      }
    }))

  it.effect("cooperates with TestClock when forked fibers sleep before adjust", () =>
    Effect.gen(function*() {
      const scenario = Effect.gen(function*() {
        let done = false
        yield* Effect.gen(function*() {
          yield* Effect.sleep("1 second")
          done = true
        }).pipe(Effect.forkChild)
        yield* TestClock.adjust("1 second")
        assert.isTrue(done)
      })

      for (let seed = 1; seed <= 25; seed++) {
        yield* scenario.pipe(Effect.provide(TestScheduler.layer({ seed })))
        yield* scenario.pipe(
          Effect.provide(TestClock.layer()),
          Effect.provide(TestScheduler.layer({ seed }))
        )
      }
    }))

  it.effect("waits for a sleeper on another scheduler when only adjust uses TestScheduler", () =>
    Effect.gen(function*() {
      let done = false
      yield* Effect.gen(function*() {
        yield* Effect.sleep("1 second")
        for (let i = 0; i < 20; i++) yield* Effect.yieldNow
        yield* Effect.sleep("1 second")
        done = true
      }).pipe(Effect.forkChild({ startImmediately: true }))
      yield* TestClock.adjust("2 seconds").pipe(Effect.provide(TestScheduler.layer({ seed: 1, preempt: 0 })))
      assert.isTrue(done)
    }))
})
