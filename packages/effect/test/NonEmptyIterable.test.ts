import { Chunk, NonEmptyIterable } from "effect"
import { deepStrictEqual, strictEqual, throws } from "effect/test/util"
import { describe, it } from "vitest"

describe("NonEmptyIterable", () => {
  it("should get head and rest", () => {
    const [head, rest] = NonEmptyIterable.unprepend(Chunk.make(0, 1, 2))
    const restArray: Array<number> = []
    let next = rest.next()
    while (!next.done) {
      restArray.push(next.value)
      next = rest.next()
    }
    strictEqual(head, 0)
    deepStrictEqual(restArray, [1, 2])
  })
  it("should throw", () => {
    throws(() => NonEmptyIterable.unprepend(Chunk.empty as any))
  })
})
