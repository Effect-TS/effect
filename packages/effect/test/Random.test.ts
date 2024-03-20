import * as it from "@effect/vitest"
import { Chunk, Effect, Random, ReadonlyArray } from "effect"
import { assert, describe } from "vitest"

describe("Random", () => {
  it.effect("shuffle", () =>
    Effect.gen(function*($) {
      const start = ReadonlyArray.range(0, 100)
      const end = yield* $(Random.shuffle(start))
      assert.isTrue(Chunk.every(end, (n) => n !== undefined))
      assert.deepStrictEqual(start.sort(), Array.from(end).sort())
    }).pipe(Effect.repeatN(100)))
})
