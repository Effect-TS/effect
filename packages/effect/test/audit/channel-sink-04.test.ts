import { assert, describe, it } from "@effect/vitest"
import * as Channel from "effect/Channel"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"

describe("Channel", () => {
  // Channel.ts:6335-6345 (mergeAll) closes the child scope under Effect.exit and discards the close Exit.
  // Expected contract: a release defect after successful usage is surfaced, as for acquireUseRelease
  // (Channel.test.ts "acquireUseRelease surfaces release failure after successful usage") and direct runCollect.
  it.effect("mergeAll surfaces inner release defect", () =>
    Effect.gen(function*() {
      const inner = Channel.acquireRelease(Effect.succeed(1), () => Effect.die("release defect"))
      const exit = yield* Channel.succeed(inner).pipe(
        Channel.mergeAll({ concurrency: 1 }),
        Channel.runCollect,
        Effect.exit
      )
      assert.deepStrictEqual(exit, Exit.die("release defect"))
    }))
})
