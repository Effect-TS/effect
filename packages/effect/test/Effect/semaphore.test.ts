import * as D from "effect/Duration"
import * as Effect from "effect/Effect"
import { strictEqual } from "effect/test/util"
import * as it from "effect/test/utils/extend"
import * as TestClock from "effect/TestClock"
import { describe } from "vitest"

describe("Effect", () => {
  it.effect("semaphore works", () =>
    Effect.gen(function*($) {
      const sem = yield* $(Effect.makeSemaphore(4))
      const messages: Array<string> = []
      yield* $(
        Effect.fork(Effect.all(
          [0, 1, 2, 3].map((n) =>
            sem.withPermits(2)(Effect.delay(D.seconds(2))(Effect.sync(() => messages.push(`process: ${n}`))))
          ),
          { concurrency: "unbounded", discard: true }
        ))
      )
      yield* $(TestClock.adjust(D.seconds(3)))
      strictEqual(messages.length, 2)
      yield* $(TestClock.adjust(D.seconds(3)))
      strictEqual(messages.length, 4)
      yield* $(
        Effect.fork(Effect.all(
          [0, 1, 2, 3].map((n) =>
            sem.withPermits(2)(Effect.delay(D.seconds(2))(Effect.sync(() => messages.push(`process: ${n}`))))
          ),
          { concurrency: "unbounded", discard: true }
        ))
      )
      yield* $(TestClock.adjust(D.seconds(3)))
      strictEqual(messages.length, 6)
      yield* $(TestClock.adjust(D.seconds(3)))
      strictEqual(messages.length, 8)
    }))

  it.effect("releaseAll", () =>
    Effect.gen(function*(_) {
      const sem = yield* _(Effect.makeSemaphore(4))
      yield* _(sem.take(4))
      yield* _(sem.releaseAll)
      yield* _(sem.take(1))
    }))
})
