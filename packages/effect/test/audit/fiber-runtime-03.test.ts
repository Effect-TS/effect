import { assert, it } from "@effect/vitest"
import { Effect, Exit } from "effect"

// packages/effect/src/internal/effect.ts:689 (FiberImpl.runLoop) recurses into
// runLoop from its catch block for every thrown handler exception. Effect.runSyncExit
// (packages/effect/src/Effect.ts JSDoc) promises to capture defects as an Exit, and
// finalizers must run; this must hold for deep chains like Effect.test.ts "nested
// throwing finalizers do not overflow the stack".
it("repeated throwing catchCause handlers do not overflow the stack", () => {
  let program: Effect.Effect<unknown> = Effect.die("initial")
  for (let i = 0; i < 20_000; i++) {
    program = Effect.catchCause(program, () => {
      throw "handler defect"
    })
  }
  let finalized = 0
  const exit = Effect.runSyncExit(Effect.ensuring(program, Effect.sync(() => finalized++)))
  assert.deepStrictEqual(exit, Exit.die("handler defect"))
  assert.strictEqual(finalized, 1)
})
