import { Cause, Data, Effect } from "effect"
import { assertTrue, deepStrictEqual } from "effect/test/util"
import * as it from "effect/test/utils/extend"
import { describe } from "vitest"

class TestError extends Data.TaggedError("TestError")<{}> {}

describe("Effect", () => {
  it.effect("TaggedError has a stack", () =>
    Effect.gen(function*($) {
      const cause = yield* $(Effect.flip(Effect.sandbox(Effect.withSpan("A")(new TestError()))))
      const log = Cause.pretty(cause)
      assertTrue(log.includes("TestError"))
      if (typeof window === "undefined") {
        assertTrue(log.replaceAll("\\", "/").includes("test/Effect/error.test.ts:11:78"))
      }
      assertTrue(log.includes("at A"))
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
        assertTrue(log.replaceAll("\\", "/").includes("test/Effect/error.test.ts:25"))
      }
      assertTrue(log.includes("at A"))
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
      assertTrue(log.includes("Failure: some message"))
      if (typeof window === "undefined") {
        assertTrue(log.replaceAll("\\", "/").includes("test/Effect/error.test.ts:47"))
      }
      assertTrue(log.includes("at A"))
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
      assertTrue(inspect(err).includes("MessageError: fail"))
      assertTrue(inspect(err).replaceAll("\\", "/").includes("test/Effect/error.test.ts:71"))
    })

    it.it("toString", () => {
      class MessageError extends Data.TaggedError("MessageError") {
        toString() {
          return "fail"
        }
      }
      assertTrue(inspect(new MessageError()).startsWith("fail\n"))
      deepStrictEqual(new MessageError().toJSON(), { _tag: "MessageError" })
    })

    it.it("cause", () => {
      class MessageError extends Data.TaggedError("MessageError")<{
        cause: unknown
      }> {}
      assertTrue(inspect(new MessageError({ cause: new Error("boom") })).includes("[cause]: Error: boom"))
    })
  }

  it.it("toJSON", () => {
    class MessageError extends Data.TaggedError("MessageError")<{}> {}
    deepStrictEqual(new MessageError().toJSON(), { _tag: "MessageError" })
  })
})
