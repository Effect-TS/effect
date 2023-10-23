import * as it from "effect-test/utils/extend"
import * as D from "effect/Duration"
import * as Effect from "effect/Effect"
import * as TestClock from "effect/TestClock"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
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
      assert.equal(messages.length, 2)
      yield* $(TestClock.adjust(D.seconds(3)))
      assert.equal(messages.length, 4)
      yield* $(
        Effect.fork(Effect.all(
          [0, 1, 2, 3].map((n) =>
            sem.withPermits(2)(Effect.delay(D.seconds(2))(Effect.sync(() => messages.push(`process: ${n}`))))
          ),
          { concurrency: "unbounded", discard: true }
        ))
      )
      yield* $(TestClock.adjust(D.seconds(3)))
      assert.equal(messages.length, 6)
      yield* $(TestClock.adjust(D.seconds(3)))
      assert.equal(messages.length, 8)
    }))
})
