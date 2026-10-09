import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit } from "effect"
import { ResourceMap } from "../src/internal/resourceMap.js"

describe("ResourceMap", () => {
  it.effect("closes the scope of a failed lookup", () =>
    Effect.gen(function*() {
      let finalized = 0
      const map = yield* ResourceMap.make((_key: string) =>
        Effect.addFinalizer(() => Effect.sync(() => finalized++)).pipe(Effect.andThen(Effect.fail("boom")))
      )
      const exit = yield* Effect.exit(map.get("key"))
      assert.isTrue(Exit.isFailure(exit))
      assert.strictEqual(finalized, 1)
    }).pipe(Effect.scoped))
})
