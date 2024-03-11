import { ManagedRuntime } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import * as Layer from "effect/Layer"
import { assert, describe, test } from "vitest"

describe.concurrent("ManagedRuntime", () => {
  test("memoizes the layer build", async () => {
    let count = 0
    const layer = Layer.effectDiscard(Effect.sync(() => {
      count++
    }))
    const runtime = ManagedRuntime.make(layer)
    await runtime.runPromise(Effect.unit)
    await runtime.runPromise(Effect.unit)
    await runtime.dispose()
    assert.strictEqual(count, 1)
  })

  test("provides context", async () => {
    const tag = Context.GenericTag<string>("string")
    const layer = Layer.succeed(tag, "test")
    const runtime = ManagedRuntime.make(layer)
    const result = await runtime.runPromise(tag)
    await runtime.dispose()
    assert.strictEqual(result, "test")
  })

  test("provides fiberRefs", async () => {
    const layer = Layer.setRequestCaching(true)
    const runtime = ManagedRuntime.make(layer)
    const result = await runtime.runPromise(FiberRef.get(FiberRef.currentRequestCacheEnabled))
    await runtime.dispose()
    assert.strictEqual(result, true)
  })

  test("allows sharing a MemoMap", async () => {
    let count = 0
    const layer = Layer.effectDiscard(Effect.sync(() => {
      count++
    }))
    const runtimeA = ManagedRuntime.make(layer)
    const runtimeB = ManagedRuntime.make(layer, runtimeA.memoMap)
    await runtimeA.runPromise(Effect.unit)
    await runtimeB.runPromise(Effect.unit)
    await runtimeA.dispose()
    await runtimeB.dispose()
    assert.strictEqual(count, 1)
  })
})
