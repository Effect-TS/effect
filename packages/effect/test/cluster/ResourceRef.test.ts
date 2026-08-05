import { assert, it } from "@effect/vitest"
import { Effect, Exit, Option } from "effect"
import { ResourceRef } from "../../src/unstable/cluster/internal/resourceRef.ts"

it.live("does not wedge await after a failed rebuild", () =>
  Effect.scoped(Effect.gen(function*() {
    const parentScope = yield* Effect.scope
    let fail = false
    const ref = yield* ResourceRef.from(parentScope, () => fail ? Effect.fail("failed") : Effect.succeed(1))
    fail = true
    assert.isTrue(Exit.isFailure(yield* Effect.exit(ref.rebuildUnsafe())))
    const completed = yield* Effect.exit(ref.await).pipe(Effect.timeoutOption(10))
    assert.isTrue(Option.isSome(completed))
  })))
