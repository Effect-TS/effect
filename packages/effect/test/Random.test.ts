import { Array, Chunk, Effect, Random } from "effect"
import * as it from "effect/test/utils/extend"
import { assert, describe } from "vitest"

describe("Random", () => {
  it.effect("shuffle", () =>
    Effect.gen(function*($) {
      const start = Array.range(0, 100)
      const end = yield* $(Random.shuffle(start))
      assert.isTrue(Chunk.every(end, (n) => n !== undefined))
      assert.deepStrictEqual(start.sort(), Array.fromIterable(end).sort())
    }).pipe(Effect.repeatN(100)))
})
