import { assert, it } from "@effect/vitest"
import { Effect, Exit, Scope } from "effect"

// packages/effect/src/internal/effect.ts:3962 — scopeClose calls scopeCloseUnsafe (which eagerly runs a
// singleton finalizer) before fiberEnterUninterruptibleUnsafe. Contract (Scope.close JSDoc,
// packages/effect/src/Scope.ts:469): finalizers run uninterruptibly and interruption waits for them.
it("Scope.close runs a single finalizer's cleanup effect when interrupted by it", async () => {
  const controller = new AbortController()
  const scope = Scope.makeUnsafe()
  let cleaned = false
  Effect.runSync(Scope.addFinalizerExit(scope, () => {
    controller.abort()
    return Effect.sync(() => {
      cleaned = true
    })
  }))
  await Effect.runPromiseExit(Effect.andThen(Effect.yieldNow, Scope.close(scope, Exit.void)), {
    signal: controller.signal
  })
  assert.isTrue(cleaned)
})
