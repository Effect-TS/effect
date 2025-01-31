import { Effect, pipe, Stream } from "effect"
import * as it from "effect/test/utils/extend"
import { describe } from "vitest"

class TestTarget extends EventTarget {
  emit() {
    this.dispatchEvent(new Event("test-event"))
  }
}

describe("Stream.fromEventListener", () => {
  it.effect("emitted count", (ctx) =>
    Effect.gen(function*() {
      const target = new TestTarget()

      const count = yield* pipe(
        Stream.fromEventListener(target, "test-event"),
        Stream.interruptWhen(Effect.sync(() => target.emit()).pipe(Effect.repeatN(2))),
        Stream.runCount
      )
      ctx.expect(count).toEqual(3)
    }))
})
