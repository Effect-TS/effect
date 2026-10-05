import { assert, it } from "@effect/vitest"
import { Effect, Exit } from "effect"
import * as Channel from "effect/Channel"

// Channel.merge (packages/effect/src/Channel.ts:6533) runs `onExit` only after
// `Scope.close` succeeds, so a side whose release finalizer dies never
// publishes its terminal cause. The default "both" strategy (JSDoc at
// Channel.ts:6400) waits for both sides, and running the left side directly
// fails with Die("release defect"), so the merge must fail with it too.
it.live("merge propagates a side's release finalizer defect", () =>
  Effect.gen(function*() {
    const left = Channel.acquireRelease(Effect.succeed(1), () => Effect.die("release defect"))
    const exit = yield* Channel.merge(left, Channel.empty).pipe(
      Channel.runCollect,
      Effect.timeout("500 millis"),
      Effect.exit
    )
    assert.deepStrictEqual(exit, Exit.die("release defect"))
  }))
