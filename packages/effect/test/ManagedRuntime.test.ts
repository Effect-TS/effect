import { describe, it, test } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Context, Effect, FiberRef, FiberRefs, Layer, List, ManagedRuntime } from "effect"

describe("ManagedRuntime", () => {
  test("memoizes the layer build", async () => {
    let count = 0
    const layer = Layer.effectDiscard(Effect.sync(() => {
      count++
    }))
    const runtime = ManagedRuntime.make(layer)
    await runtime.runPromise(Effect.void)
    await runtime.runPromise(Effect.void)
    await runtime.dispose()
    strictEqual(count, 1)
  })

  test("provides context", async () => {
    const tag = Context.GenericTag<string>("string")
    const layer = Layer.succeed(tag, "test")
    const runtime = ManagedRuntime.make(layer)
    const result = await runtime.runPromise(tag)
    await runtime.dispose()
    strictEqual(result, "test")
  })

  test("provides fiberRefs", async () => {
    const layer = Layer.setRequestCaching(true)
    const runtime = ManagedRuntime.make(layer)
    const result = await runtime.runPromise(FiberRef.get(FiberRef.currentRequestCacheEnabled))
    await runtime.dispose()
    strictEqual(result, true)
  })

  test("allows sharing a MemoMap", async () => {
    let count = 0
    const layer = Layer.effectDiscard(Effect.sync(() => {
      count++
    }))
    const runtimeA = ManagedRuntime.make(layer)
    const runtimeB = ManagedRuntime.make(layer, runtimeA.memoMap)
    await runtimeA.runPromise(Effect.void)
    await runtimeB.runPromise(Effect.void)
    await runtimeA.dispose()
    await runtimeB.dispose()
    strictEqual(count, 1)
  })

  it.effect("is subtype of effect", () =>
    Effect.gen(function*() {
      const tag = Context.GenericTag<string>("string")
      const layer = Layer.succeed(tag, "test")
      const managedRuntime = ManagedRuntime.make(layer)
      const runtime = yield* managedRuntime
      const result = Context.get(runtime.context, tag)
      strictEqual(result, "test")
    }))

  it.effect("does not inherit fiber refs", () =>
    Effect.gen(function*() {
      const tag = Context.GenericTag<string>("string")
      const layer = Layer.succeed(tag, "test")
      const managedRuntime = ManagedRuntime.make(layer)
      const runtime = yield* managedRuntime.runtimeEffect.pipe(
        Effect.withLogSpan("test")
      )
      const result = FiberRefs.getOrDefault(runtime.fiberRefs, FiberRef.currentLogSpan)
      deepStrictEqual(result, List.empty())
    }))

  it("can be build synchronously", () => {
    const tag = Context.GenericTag<string>("string")
    const layer = Layer.succeed(tag, "test")
    const managedRuntime = ManagedRuntime.make(layer)
    const runtime = Effect.runSync(managedRuntime.runtimeEffect)
    const result = Context.get(runtime.context, tag)
    strictEqual(result, "test")
  })
})
