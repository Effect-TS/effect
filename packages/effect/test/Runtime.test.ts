import { describe, it } from "@effect/vitest"
import { Effect, Exit, FiberRef, Layer, pipe, Runtime } from "effect"
import { assertTrue, deepStrictEqual, strictEqual } from "effect/test/util"

describe("Runtime", () => {
  it.effect("setFiberRef", () =>
    Effect.gen(function*() {
      const ref = FiberRef.unsafeMake(0)
      const runtime = Runtime.defaultRuntime.pipe(
        Runtime.setFiberRef(ref, 1)
      )
      let result = Runtime.runSync(runtime)(FiberRef.get(ref))
      strictEqual(result, 1)

      result = yield* pipe(FiberRef.get(ref), Effect.provide(runtime))
      strictEqual(result, 1)
    }))

  it.scoped("deleteFiberRef", () =>
    Effect.gen(function*() {
      const ref = FiberRef.unsafeMake({ value: 0 })
      const runtime = yield* (Layer.toRuntime(Layer.effectDiscard(FiberRef.set(ref, { value: 1 }))))

      let result = Runtime.runSync(runtime)(FiberRef.get(ref))
      deepStrictEqual(result, { value: 1 })

      result = Runtime.runSync(Runtime.deleteFiberRef(runtime, ref))(FiberRef.get(ref))
      deepStrictEqual(result, { value: 0 })
    }))

  it("runSync", () => {
    deepStrictEqual(Runtime.runSync(Runtime.defaultRuntime)(Effect.succeed(1)), 1)
    deepStrictEqual(Runtime.runSync(Runtime.defaultRuntime, Effect.succeed(1)), 1)
  })

  it("runPromiseExit/signal", async () => {
    const aborted = AbortSignal.abort()
    assertTrue(
      Exit.isInterrupted(await Runtime.runPromiseExit(Runtime.defaultRuntime)(Effect.never, { signal: aborted }))
    )

    const controller = new AbortController()
    setTimeout(() => controller.abort(), 10)
    assertTrue(
      Exit.isInterrupted(
        await Runtime.runPromiseExit(Runtime.defaultRuntime)(Effect.never, { signal: controller.signal })
      )
    )
  })
})
