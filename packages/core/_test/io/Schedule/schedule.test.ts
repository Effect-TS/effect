import { runCollect, runManually } from "@effect/core/test/io/Schedule/test-utils"
import { constVoid } from "@tsplus/stdlib/data/Function"

export function scanLeft<A, B>(self: Chunk<A>, b: B, f: (b: B, a: A) => B): Chunk<B> {
  const len = self.length
  const out = new Array(len + 1)
  out[0] = b
  for (let i = 0; i < len; i++) {
    out[i + 1] = f(out[i], self.unsafeGet(i))
  }
  return Chunk.from(out)
}

describe.concurrent("Schedule", () => {
  it.effect("either should not wait if neither schedule wants to continue", () =>
    Do(($) => {
      const schedule = Schedule.stop
        .union(Schedule.spaced((2).seconds).intersect(Schedule.stop))
        .compose(Schedule.elapsed)
      const input = Chunk.fill(4, constVoid)
      const result = $(runCollect(schedule, input))
      assert.isTrue(result == Chunk((0).millis))
    }))

  it.effect("perform log for each recurrence of effect", () =>
    Do(($) => {
      function schedule(ref: Ref<number>) {
        return Schedule.recurs(3).onDecision(() => ref.update((n) => n + 1))
      }
      const ref = $(Ref.make(0))
      $(ref.getAndUpdate((n) => n + 1).repeat(schedule(ref)))
      const result = $(ref.get)
      assert.strictEqual(result, 8)
    }))

  it.effect("reset after some inactivity", () =>
    Do(($) => {
      function io(ref: Ref<number>, latch: Deferred<never, void>): Effect<never, string, void> {
        return ref.updateAndGet((n) => n + 1)
          .flatMap((retries) => {
            // The 5th retry will fail after 10 seconds to let the schedule reset
            if (retries == 5) {
              return latch.succeed(undefined).zipRight(io(ref, latch).delay((10).seconds))
            }
            // The 10th retry will succeed, which is only possible if the schedule was reset
            if (retries == 10) {
              return Effect.unit
            }
            return Effect.fail("Boom")
          })
      }
      const schedule = Schedule.recurs(5).resetAfter((5).seconds)
      const retriesCounter = $(Ref.make(-1))
      const latch = $(Deferred.make<never, void>())
      const fiber = $(io(retriesCounter, latch).retry(schedule).fork)
      $(latch.await)
      $(TestClock.adjust((10).seconds))
      $(fiber.join)
      const retries = $(retriesCounter.get)
      assert.strictEqual(retries, 10)
    }))

  it.effect("union of two schedules should continue as long as either wants to continue", () =>
    Do(($) => {
      const schedule = Schedule.recurWhile((b: boolean) => b).union(Schedule.fixed((1).seconds))
      const input = List(true, false, false, false, false)
      const result = $(runCollect(schedule.compose(Schedule.elapsed), input))
      const expected = Chunk((0).seconds, (0).seconds, (1).seconds, (2).seconds, (3).seconds)
      assert.isTrue(result == expected)
    }))

  it.effect("Schedule.fixed should compute delays correctly", () =>
    Do(($) => {
      const inputs = List(0, 6500).zip(List(undefined, undefined))
      const result = $(
        runManually(Schedule.fixed((5).seconds), inputs).map((output) =>
          output[0].map((tuple) => tuple[0])
        )
      )
      assert.isTrue(result == List(5000, 10000))
    }))

  it.effect("intersection of schedules recurring in bounded intervals", () =>
    Do(($) => {
      const schedule = Schedule.hourOfDay(4).intersect(Schedule.minuteOfHour(20))
      const now = $(Effect.sync(Date.now()))
      const input = Chunk(1, 2, 3, 4, 5)
      const delays = $(schedule.delays.run(now, input))
      const actual = scanLeft(delays, now, (now, delay) => now + delay.millis).unsafeTail
      assert.isTrue(actual.map((n) => new Date(n).getHours()).forAll((n) => n === 4))
      assert.isTrue(actual.map((n) => new Date(n).getMinutes()).forAll((n) => n === 20))
    }))

  it.effect("passthrough", () =>
    Do(($) => {
      const ref = $(Ref.make(0))
      const result = $(ref.getAndUpdate((n) => n + 1).repeat(Schedule.recurs(10).passthrough))
      assert.strictEqual(result, 10)
    }))
})
