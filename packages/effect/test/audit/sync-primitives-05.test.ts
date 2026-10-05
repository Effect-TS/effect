import { assert, describe, it } from "@effect/vitest"
import { Effect, PartitionedSemaphore } from "effect"

describe("PartitionedSemaphore", () => {
  // releaseUnsafe (PartitionedSemaphore.ts:146-171) resumes waiters inline, so each synchronous
  // task's release re-enters it until the stack overflows. Contract: released permits are assigned
  // to waiters (release JSDoc, :426) and released again when each guarded effect exits
  // (withPermits JSDoc, :443), so a long queue of finite tasks must fully drain.
  it.effect("drains a long queue of synchronous withPermit tasks", () =>
    Effect.gen(function*() {
      const sem = yield* PartitionedSemaphore.make<string>({ permits: 1 })
      yield* sem.take("holder", 1)
      let completed = 0
      for (let i = 0; i < 10_000; i++) {
        yield* Effect.forkDetach(sem.withPermit(String(i))(Effect.sync(() => completed++)))
      }
      yield* Effect.yieldNow
      yield* sem.release(1)
      yield* Effect.yieldNow
      assert.strictEqual(completed, 10_000)
      assert.strictEqual(yield* sem.available, 1)
    }))
})
