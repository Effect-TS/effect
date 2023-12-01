import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { assert, describe, expect } from "vitest"

class TestError extends Data.TaggedError("TestError")<{}> {}

describe.concurrent("Effect", () => {
  it.effect("TaggedError has a stack", () =>
    Effect.gen(function*($) {
      const cause = yield* $(Effect.flip(Effect.sandbox(Effect.withSpan("A")(new TestError()))))
      const log = Cause.pretty(cause)
      expect(log).includes("TestError")
      if (typeof window === "undefined") {
        expect(log.replaceAll("\\", "/")).includes("test/Effect/error.test.ts:12:78")
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
        expect(log.replaceAll("\\", "/")).includes("test/Effect/error.test.ts:26")
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
        expect(log.replaceAll("\\", "/")).includes("test/Effect/error.test.ts:48")
      }
      expect(log).includes("at A")
    }))

  if (typeof window === "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { inspect } = require("node:util")

    it.it("inspect", () => {
      class MessageError extends Data.TaggedError("MessageError") {
        get message() {
          return "fail"
        }
      }
      const err = new MessageError()
      expect(inspect(err)).include("MessageError: fail")
      expect(inspect(err).replaceAll("\\", "/")).include("test/Effect/error.test.ts:72")
    })

    it.it("toString", () => {
      class MessageError extends Data.TaggedError("MessageError") {
        toString() {
          return "fail"
        }
      }
      expect(inspect(new MessageError()).startsWith("fail\n")).toBe(true)
      assert.deepStrictEqual(new MessageError().toJSON(), { _tag: "MessageError" })
    })
  }

  it.it("toJSON", () => {
    class MessageError extends Data.TaggedError("MessageError")<{}> {}
    assert.deepStrictEqual(new MessageError().toJSON(), { _tag: "MessageError" })
  })
})
