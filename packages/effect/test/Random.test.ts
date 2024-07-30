import { Array, Chunk, Data, Effect, Random } from "effect"
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

  it.effect("make", () =>
    Effect.gen(function*() {
      const random0 = Random.make("foo")
      const random1 = Random.make("foo")
      const random2 = Random.make(Data.struct({ foo: "bar" }))
      const random3 = Random.make(Data.struct({ foo: "bar" }))
      const n0 = yield* random0.next
      const n1 = yield* random1.next
      const n2 = yield* random2.next
      const n3 = yield* random3.next
      assert.strictEqual(n0, n1)
      assert.strictEqual(n2, n3)
      assert.notStrictEqual(n0, n2)
    }))
})
