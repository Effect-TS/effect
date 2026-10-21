import { describe, it, vi } from "@effect/vitest"
import { assertInclude, assertTrue, deepStrictEqual, strictEqual, throws } from "@effect/vitest/utils"
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

  it.sequential("supports a non-writable Error.stackTraceLimit", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(Error, "stackTraceLimit")!
    Object.defineProperty(Error, "stackTraceLimit", { ...descriptor, writable: false })
    vi.resetModules()
    try {
      const { Cause, Context, Effect, Exit, Layer, LayerMap, Micro, Runtime } = await import("effect")

      class A extends Context.Tag("A")<A, { readonly a: () => Effect.Effect<number> }>() {}
      class B extends Context.Reference<B>()("B", { defaultValue: () => 1 }) {}
      class C extends Effect.Tag("C")<C, number>() {}
      class D extends Effect.Service<D>()("D", { succeed: { d: 1 } }) {}
      const F = Context.GenericTag<number>("F")
      class E extends LayerMap.Service<E>()("E", { lookup: (_key: string) => Layer.succeed(F, 1) }) {}
      strictEqual(E.key, "E")

      const add = Effect.fn(function*(a: number, b: number) {
        return a + b
      })
      const double = Effect.functionWithSpan({
        body: (n: number) => Effect.succeed(n * 2),
        options: { name: "double" }
      })
      const program = Effect.fn("program")(function*() {
        const b = yield* B
        const c = yield* C
        const { d } = yield* D
        const f = yield* F
        return yield* add(b + c, yield* double(d + f))
      })
      strictEqual(
        Effect.runSync(
          program().pipe(
            Effect.withSpan("span"),
            Effect.provide(D.Default),
            Effect.provideService(C, 1),
            Effect.provideService(F, 1)
          )
        ),
        6
      )

      const exit = Effect.runSyncExit(Effect.flatMap(A, (a) => a.a()).pipe(Effect.provide(Layer.mock(A, {}))))
      assertTrue(Exit.isFailure(exit))
      assertInclude(Cause.pretty(exit.cause), "A: Unimplemented method \"a\"")

      throws(() => Effect.runSync(Effect.promise(() => Promise.resolve(1))), (u) => {
        assertTrue(Runtime.isFiberFailure(u))
        assertTrue(Runtime.isAsyncFiberException(Cause.squash(u[Runtime.FiberFailureCauseId])))
      })

      assertTrue(Micro.exitIsFailure(Micro.runSyncExit(Micro.fail("boom").pipe(Micro.withTrace("trace")))))
    } finally {
      Object.defineProperty(Error, "stackTraceLimit", descriptor)
      vi.resetModules()
    }
  })
})
