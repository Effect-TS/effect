import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import { ResourceMap } from "../../src/unstable/cluster/internal/resourceMap.ts"

it.effect("closes a failed lookup scope", () =>
  Effect.scoped(Effect.gen(function*() {
    let finalized = 0
    const map = yield* ResourceMap.make((_key: string) =>
      Effect.gen(function*() {
        yield* Effect.addFinalizer(() => Effect.sync(() => finalized++))
        return yield* Effect.fail("failed")
      }))
    yield* Effect.exit(map.get("key"))
    assert.strictEqual(finalized, 1)
  })))
