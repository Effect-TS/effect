import { assert, describe, it } from "@effect/vitest"
import { Equal, Hash, HashSet, MutableRef } from "effect"

describe("MutableRef", () => {
  it("uses stable reference equality and hashing", () => {
    const left = MutableRef.make(0)
    const right = MutableRef.make(0)
    const initialHash = Hash.hash(left)

    assert.isTrue(Equal.equals(left, left))
    assert.isFalse(Equal.equals(left, right))
    assert.strictEqual(HashSet.size(HashSet.make(left, right)), 2)

    MutableRef.set(left, 1)
    MutableRef.set(right, 1)

    assert.isFalse(Equal.equals(left, right))
    assert.strictEqual(Hash.hash(left), initialHash)
  })
})
