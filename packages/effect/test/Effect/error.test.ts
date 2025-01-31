import { describe, it } from "@effect/vitest"
import { Cause, Data, Effect, pipe } from "effect"
import { assertIncludes, assertTrue, deepStrictEqual } from "effect/test/util"

class TestError extends Data.TaggedError("TestError")<{}> {}

describe("Effect", () => {
  it.effect("TaggedError has a stack", () =>
    Effect.gen(function*() {
      const cause = yield* (Effect.flip(Effect.sandbox(Effect.withSpan("A")(new TestError()))))
      const log = Cause.pretty(cause)
      assertTrue(log.includes("TestError"))
      if (typeof window === "undefined") {
        assertIncludes(log.replaceAll("\\", "/"), "test/Effect/error.test.ts:10:77")
      }
      assertTrue(log.includes("at A"))
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
        assertIncludes(log.replaceAll("\\", "/"), "test/Effect/error.test.ts:24")
      }
      assertIncludes(log, "at A")
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
      assertIncludes(log, "Failure: some message")
      if (typeof window === "undefined") {
        assertIncludes(log.replaceAll("\\", "/"), "test/Effect/error.test.ts:46")
      }
      assertIncludes(log, "at A")
    }))

  if (typeof window === "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { inspect } = require("node:util")

    it("inspect", () => {
      class MessageError extends Data.TaggedError("MessageError") {
        get message() {
          return "fail"
        }
      }
      const err = new MessageError()
      assertIncludes(inspect(err), "MessageError: fail")
      assertIncludes(inspect(err).replaceAll("\\", "/"), "test/Effect/error.test.ts:70")
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
      assertTrue(inspect(new MessageError({ cause: new Error("boom") })).includes("[cause]: Error: boom"))
    })
  }

  it("toJSON", () => {
    class MessageError extends Data.TaggedError("MessageError")<{}> {}
    deepStrictEqual(new MessageError().toJSON(), { _tag: "MessageError" })
  })
})
