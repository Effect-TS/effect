import { describe, it } from "@effect/vitest"
import { assertInclude, assertTrue, deepStrictEqual } from "@effect/vitest/utils"
import { Cause, Data, Effect, pipe } from "effect"

class TestError extends Data.TaggedError("TestError")<{}> {}

describe("Effect", () => {
  it.effect("TaggedError has a stack", () =>
    Effect.gen(function*() {
      const cause = yield* (Effect.flip(Effect.sandbox(Effect.withSpan("A")(new TestError()))))
      const log = Cause.pretty(cause)
      assertInclude(log, "TestError")
      if (typeof window === "undefined") {
        assertInclude(log.replaceAll("\\", "/"), "test/Effect/error.test.ts:10:77")
      }
      assertInclude(log, "at A")
    }))

  it.effect("tryPromise", () =>
    Effect.gen(function*() {
      const cause = yield* pipe(
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
        assertInclude(log.replaceAll("\\", "/"), "test/Effect/error.test.ts:24")
      }
      assertInclude(log, "at A")
    }))

  it.effect("allow message prop", () =>
    Effect.gen(function*() {
      class MessageError extends Data.TaggedError("MessageError")<{
        readonly name: string
        readonly message: string
      }> {}
      const cause = yield* pipe(
        Effect.tryPromise({
          try: () => Promise.reject("fail"),
          catch: () => new MessageError({ name: "Failure", message: "some message" })
        }),
        Effect.withSpan("A"),
        Effect.sandbox,
        Effect.flip
      )
      const log = Cause.pretty(cause)
      assertInclude(log, "Failure: some message")
      if (typeof window === "undefined") {
        assertInclude(log.replaceAll("\\", "/"), "test/Effect/error.test.ts:46")
      }
      assertInclude(log, "at A")
    }))

  if (typeof window === "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { inspect } = require("node:util")

    it("inspect", () => {
      class MessageError extends Data.TaggedError("MessageError") {
        get message() {
          return "fail"
        }
      }
      const err = new MessageError()
      assertInclude(inspect(err), "MessageError: fail")
      assertInclude(inspect(err).replaceAll("\\", "/"), "test/Effect/error.test.ts:70")
    })

    it("toString", () => {
      class MessageError extends Data.TaggedError("MessageError") {
        toString() {
          return "fail"
        }
      }
      assertTrue(inspect(new MessageError()).startsWith("fail\n"))
      deepStrictEqual(new MessageError().toJSON(), { _tag: "MessageError" })
    })

    it("cause", () => {
      class MessageError extends Data.TaggedError("MessageError")<{
        cause: unknown
      }> {}
      assertInclude(inspect(new MessageError({ cause: new Error("boom") })), "[cause]: Error: boom")
    })
  }

  it("toJSON", () => {
    class MessageError extends Data.TaggedError("MessageError")<{}> {}
    deepStrictEqual(new MessageError().toJSON(), { _tag: "MessageError" })
  })
})
