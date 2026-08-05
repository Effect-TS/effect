import { assert, it } from "@effect/vitest"
import { Effect, Exit, Option, Scope } from "effect"
import { ResourceRef } from "effect/unstable/cluster/internal/resourceRef"

it.live("does not wedge await after a failed rebuild", () =>
  Effect.scoped(Effect.gen(function*() {
    const parentScope = yield* Effect.scope
    let fail = false
    let releases = 0
    const ref = yield* ResourceRef.from(parentScope, (scope) =>
      Scope.addFinalizer(
        scope,
        Effect.sync(() => releases++)
      ).pipe(
        Effect.andThen(fail ? Effect.fail("failed") : Effect.succeed(1))
      ))
    fail = true
    assert.deepStrictEqual(yield* Effect.exit(ref.rebuildUnsafe()), Exit.fail("failed"))
    assert.strictEqual(releases, 2)
    const completed = yield* Effect.exit(ref.await).pipe(Effect.timeoutOption(10))
    assert.deepStrictEqual(completed, Option.some(Exit.fail("failed")))
    fail = false
    yield* ref.rebuildUnsafe()
    assert.strictEqual(yield* ref.await, 1)
  })))
