import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Stream } from "effect"
import { TestClock } from "effect/testing"
import { Template } from "effect/unstable/http"

describe("Template", () => {
  it.effect("preserves template segment order", () =>
    Effect.gen(function*() {
      const fiber = yield* Stream.runCollect(
        Template.stream`a${Effect.delay(Effect.succeed("slow"), "1 second")}b${"fast"}c`
      ).pipe(Effect.forkChild)
      yield* Effect.yieldNow
      yield* TestClock.adjust("1 second")
      const chunks = yield* Fiber.join(fiber)
      assert.strictEqual(chunks.join(""), "aslowbfastc")
    }))
})
