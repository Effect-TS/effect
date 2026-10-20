import { Reactivity } from "@effect/experimental"
import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Scope } from "effect"

describe("Reactivity", () => {
  it.scoped("query stops rerunning its effect after a failure ends the mailbox", () =>
    Effect.gen(function*() {
      const reactivity = yield* Reactivity.make
      let runs = 0
      const failed = yield* reactivity.query(
        ["todos"],
        Effect.suspend(() => {
          runs++
          return Effect.fail("boom")
        })
      )
      const live = yield* reactivity.query(["todos"], Effect.succeed(42))
      assert.strictEqual(yield* Effect.flip(failed.take), "boom")
      assert.strictEqual(yield* live.take, 42)
      yield* reactivity.invalidate(["todos"])
      assert.strictEqual(yield* live.take, 42)
      assert.strictEqual(runs, 1)
    }))

  it.scoped("query drops an invalidation pending when its run fails", () =>
    Effect.gen(function*() {
      const reactivity = yield* Reactivity.make
      const latch = yield* Deferred.make<void>()
      let runs = 0
      const failed = yield* reactivity.query(
        ["todos"],
        Effect.suspend(() => {
          runs++
          return Effect.zipRight(Deferred.await(latch), Effect.fail("boom"))
        })
      )
      yield* reactivity.invalidate(["todos"])
      yield* Deferred.succeed(latch, void 0)
      assert.strictEqual(yield* Effect.flip(failed.take), "boom")
      yield* Effect.yieldNow()
      assert.strictEqual(runs, 1)
    }))

  it.effect("closing the scope of a failed query succeeds", () =>
    Effect.gen(function*() {
      const reactivity = yield* Reactivity.make
      const scope = yield* Scope.make()
      const failed = yield* reactivity.query(["todos"], Effect.fail("boom")).pipe(Scope.extend(scope))
      assert.strictEqual(yield* Effect.flip(failed.take), "boom")
      const exit = yield* Effect.exit(Scope.close(scope, Exit.void))
      assert.isTrue(Exit.isSuccess(exit))
    }))
})
