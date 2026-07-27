import { describe, it } from "@effect/vitest"
import { Effect, Fiber, pipe, Stream } from "effect"

class TestTarget extends EventTarget {
  listening = false

  override addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ): void {
    super.addEventListener(type, callback, options)
    this.listening = true
  }

  emit() {
    this.dispatchEvent(new Event("test-event"))
  }
}

describe("Stream.fromEventListener", () => {
  it.effect("emitted count", (ctx) =>
    Effect.gen(function*() {
      const target = new TestTarget()

      const fiber = yield* pipe(
        Stream.fromEventListener(target, "test-event"),
        Stream.take(3),
        Stream.runCount,
        Effect.fork
      )
      const waitForListener = (): Effect.Effect<void> =>
        Effect.suspend(() => target.listening ? Effect.void : Effect.zipRight(Effect.yieldNow(), waitForListener()))
      yield* Effect.raceFirst(
        waitForListener(),
        Fiber.join(fiber).pipe(Effect.flatMap(() => Effect.dieMessage("stream ended before listener registration")))
      )
      target.emit()
      target.emit()
      target.emit()
      const count = yield* Fiber.join(fiber)
      ctx.expect(count).toEqual(3)
    }))
})
