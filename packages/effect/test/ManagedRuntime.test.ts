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
    const run = ManagedRuntime.runPromise(runtime)
    await run(Effect.unit)
    await run(Effect.unit)
    await ManagedRuntime.dispose(runtime)
    assert.strictEqual(count, 1)
  })

  test("provides context", async () => {
    const tag = Context.GenericTag<string>("string")
    const layer = Layer.succeed(tag, "test")
    const runtime = ManagedRuntime.make(layer)
    const run = ManagedRuntime.runPromise(runtime)
    const result = await run(tag)
    await ManagedRuntime.dispose(runtime)
    assert.strictEqual(result, "test")
  })

  test("provides fiberRefs", async () => {
    const layer = Layer.setRequestCaching(true)
    const runtime = ManagedRuntime.make(layer)
      const run = ManagedRuntime.runPromise(runtime)
    const result = await run(FiberRef.get(FiberRef.currentRequestCacheEnabled))
    await ManagedRuntime.dispose(runtime)
    assert.strictEqual(result, true)
  })

  test("allows sharing a MemoMap", async () => {
    let count = 0
    const layer = Layer.effectDiscard(Effect.sync(() => {
      count++
    }))
    const runtimeA = ManagedRuntime.make(layer)
    const runtimeB = ManagedRuntime.make(layer, runtimeA.memoMap)
    await ManagedRuntime.runPromise(runtimeA)(Effect.unit)
    await ManagedRuntime.runPromise(runtimeB)(Effect.unit)
    await ManagedRuntime.dispose(runtimeA)
    await ManagedRuntime.dispose(runtimeB)
    assert.strictEqual(count, 1)
  })
})
