import * as it from "effect-test/utils/extend"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Queue from "effect/Queue"
import * as TestClock from "effect/TestClock"
import { assert, describe } from "vitest"

describe("Effect", () => {
  it.effect("bounded 0 is rendezvous", () =>
    Effect.gen(function*(_) {
      const rendevous = yield* _(Queue.bounded<string>(0))
      const logs: Array<string> = []

      const fiber = yield* _(
        Effect.fork(
          Effect.gen(function*(_) {
            yield* _(Effect.sleep("50 millis"))
            logs.push("sending message")
            yield* _(Queue.offer(rendevous, "Hello World"))
            logs.push("sent message")
          })
        )
      )

      const fiber2 = yield* _(
        Effect.fork(
          Effect.gen(function*(_) {
            yield* _(Effect.sleep("100 millis"))
            logs.push("receiving message")
            const message = yield* _(Queue.take(rendevous))
            logs.push("received message")
            logs.push(message)
          })
        )
      )

      yield* _(TestClock.adjust("200 millis"))

      yield* _(Fiber.join(Fiber.zip(fiber, fiber2)))

      assert.deepEqual(logs, [
        "sending message",
        "receiving message",
        "received message",
        "Hello World",
        "sent message"
      ])
    }))
})
