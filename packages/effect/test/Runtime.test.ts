import { Effect, FiberRef, Layer, Runtime } from "effect"
import { assert, describe } from "vitest"
import * as it from "./utils/extend.js"

describe("Runtime", () => {
  it.effect("setFiberRef", () =>
    Effect.gen(function*(_) {
      const ref = FiberRef.unsafeMake(0)
      const runtime = Runtime.defaultRuntime.pipe(
        Runtime.setFiberRef(ref, 1)
      )
      let result = Runtime.runSync(runtime)(FiberRef.get(ref))
      assert.strictEqual(result, 1)

      result = yield* _(FiberRef.get(ref), Effect.provide(runtime))
      assert.strictEqual(result, 1)
    }))

  it.scoped("deleteFiberRef", () =>
    Effect.gen(function*(_) {
      const ref = FiberRef.unsafeMake({ value: 0 })
      const runtime = yield* _(Layer.toRuntime(Layer.effectDiscard(FiberRef.set(ref, { value: 1 }))))

      let result = Runtime.runSync(runtime)(FiberRef.get(ref))
      assert.deepStrictEqual(result, { value: 1 })

      result = Runtime.runSync(Runtime.deleteFiberRef(runtime, ref))(FiberRef.get(ref))
      assert.deepStrictEqual(result, { value: 0 })
    }))
})
