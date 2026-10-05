import { assert, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Pool, Scope } from "effect"

// Pool.ts:399-422 (shutdown) / Pool.ts:326 (makeWithStrategy JSDoc): closing the pool's scope shuts down the
// pool and releases allocated items. A still-borrowed item must therefore be finalized (after its last
// lease returns) before owner scope closure completes and earlier owner finalizers run.
it.effect("Pool shutdown waits for borrowed items to be finalized", () =>
  Effect.gen(function*() {
    const events: Array<string> = []
    const owner = yield* Scope.make()
    const borrower = yield* Scope.make()
    yield* Scope.addFinalizer(owner, Effect.sync(() => events.push("owner-dependency-released")))
    const pool = yield* Pool.make({
      size: 1,
      acquire: Effect.acquireRelease(Effect.succeed("r"), () => Effect.sync(() => events.push("resource-released")))
    }).pipe(Scope.provide(owner))
    yield* Pool.get(pool).pipe(Scope.provide(borrower))
    const closing = yield* Effect.forkChild(Scope.close(owner, Exit.void), { startImmediately: true })
    yield* Effect.yieldNow
    yield* Scope.close(borrower, Exit.void)
    yield* Fiber.join(closing)
    assert.deepStrictEqual(events, ["resource-released", "owner-dependency-released"])
  }))
