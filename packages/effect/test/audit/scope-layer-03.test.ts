import { assert, test } from "@effect/vitest"
import { Effect, Layer, ManagedRuntime } from "effect"

// ManagedRuntime.make JSDoc (packages/effect/src/ManagedRuntime.ts:269-274) documents running a program
// with `Effect.ensuring(runtime.disposeEffect)` through `runtime.runPromise`. That must settle and release
// layer resources even when the program crosses an async boundary (fiberScope at ManagedRuntime.ts:294-296).
test("disposeEffect inside runPromise after an async boundary releases the layer", async () => {
  let released = false
  const runtime = ManagedRuntime.make(Layer.effectDiscard(Effect.addFinalizer(() =>
    Effect.sync(() => {
      released = true
    })
  )))
  const result = await Promise.race([
    runtime.runPromise(Effect.sleep(1).pipe(Effect.ensuring(runtime.disposeEffect))).then(() => "settled"),
    new Promise<string>((resolve) => setTimeout(() => resolve("timed out"), 500))
  ])
  assert.deepStrictEqual({ result, released }, { result: "settled", released: true })
})
