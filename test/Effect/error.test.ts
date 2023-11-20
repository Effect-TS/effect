import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { inspect } from "node:util"
import { assert, describe, expect } from "vitest"

class TestError extends Data.TaggedError("TestError")<{}> {}

describe.concurrent("Effect", () => {
  it.effect("TaggedError has a stack", () =>
    Effect.gen(function*($) {
      const cause = yield* $(Effect.flip(Effect.sandbox(Effect.withSpan("A")(new TestError()))))
      const log = Cause.pretty(cause)
      expect(log).includes("TestError: ")
      if (typeof window === "undefined") {
        expect(log).includes("test/Effect/error.test.ts:13:78")
      }
      expect(log).includes("at A")
    }))

  it.effect("tryPromise", () =>
    Effect.gen(function*($) {
      const cause = yield* $(
        Effect.tryPromise({
          try: () => Promise.reject("fail"),
          catch: () => new TestError()
        }),
        Effect.withSpan("A"),
        Effect.sandbox,
        Effect.flip
      )
      const log = Cause.pretty(cause)
      if (typeof window === "undefined") {
        expect(log).includes("test/Effect/error.test.ts:27")
      }
      expect(log).includes("at A")
    }))

  it.effect("allow message prop", () =>
    Effect.gen(function*($) {
      class MessageError extends Data.TaggedError("MessageError")<{
        readonly name: string
        readonly message: string
      }> {}
      const cause = yield* $(
        Effect.tryPromise({
          try: () => Promise.reject("fail"),
          catch: () => new MessageError({ name: "Failure", message: "some message" })
        }),
        Effect.withSpan("A"),
        Effect.sandbox,
        Effect.flip
      )
      const log = Cause.pretty(cause)
      expect(log).includes("Failure: some message")
      if (typeof window === "undefined") {
        expect(log).includes("test/Effect/error.test.ts:49")
      }
      expect(log).includes("at A")
    }))

  it.it("toString", () => {
    class MessageError extends Data.TaggedError("MessageError")<{}> {
      toString() {
        return "fail"
      }
    }
    expect(inspect(new MessageError())).equal("fail")
    assert.deepStrictEqual(new MessageError().toJSON(), { _tag: "MessageError" })
  })

  it.it("toJSON", () => {
    class MessageError extends Data.TaggedError("MessageError")<{}> {
      toString() {
        return "fail"
      }
    }
    assert.deepStrictEqual(new MessageError().toJSON(), { _tag: "MessageError" })
  })
})
