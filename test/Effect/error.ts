import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { describe, expect } from "vitest"

class TestError extends Data.TaggedError("TestError")<{}> {}

describe.concurrent("Effect", () => {
  it.effect("TaggedError has a stack", () =>
    Effect.gen(function*($) {
      const cause = yield* $(Effect.flip(Effect.sandbox(Effect.withSpan("A")(new TestError()))))
      const log = Cause.pretty(cause)
      expect(log).includes("test/Effect/error.ts:12:78")
      expect(log).includes("at A")
    }))
})
