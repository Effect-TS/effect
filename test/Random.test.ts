import { Chunk, Effect, Random, ReadonlyArray } from "effect"
import * as it from "effect-test/utils/extend"
import { assert, describe } from "vitest"

describe.concurrent("Random", () => {
  it.effect("shuffle", () =>
    Effect.gen(function*($) {
      const start = ReadonlyArray.range(0, 100)
      const end = yield* $(Random.shuffle(start))
      assert.isTrue(Chunk.every(end, (n) => n !== undefined))
      assert.deepStrictEqual(start.sort(), Array.from(end).sort())
    }).pipe(Effect.repeatN(100)))
})
