import { assert, it } from "@effect/vitest"
import { Effect, Exit, Fiber } from "effect"

// Effect.effectify (src/Effect.ts:15072-15079) evaluates `onError` inside the
// callback handed to the external API. Per its contract (Effect.ts:15005-15014)
// callback errors are converted into the returned Effect, and the synchronous
// path already turns a throwing mapper into a defect (like Effect.tryPromise).
// A throwing mapper in an asynchronous callback must likewise become a Die,
// complete the fiber, and run `ensuring` finalizers (Effect.ts:6777-6780).
it("effectify turns a throwing onError mapper in an async callback into a defect", async () => {
  let cb!: (error: Error | null, value?: string) => void
  let finalized = false
  const f = Effect.effectify(
    (callback: (error: Error | null, value?: string) => void) => {
      cb = callback
    },
    () => {
      throw new Error("mapper")
    }
  )
  const fiber = Effect.runFork(
    f().pipe(Effect.ensuring(Effect.sync(() => {
      finalized = true
    })))
  )
  await Promise.resolve()
  assert.doesNotThrow(() => cb(new Error("source")))
  const exit = await Effect.runPromise(Fiber.await(fiber))
  assert.isTrue(Exit.hasDies(exit))
  assert.isTrue(finalized)
})
